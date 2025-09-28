let log_colors = {};
let log_pageReplacements = {};
let log_statusTypes = {};
let log_pages = [];

async function loadJSONData() {
    try {
        const response = await fetch('vocabulary.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();

        const logColorsArray = data.logs.log_colors;
        log_colors = logColorsArray.reduce((acc, colorObj) => {
            const key = Object.keys(colorObj)[0];
            acc[key] = colorObj[key];
            return acc;
        }, {});

        const logPageReplacementsArray = data.logs.log_pageReplacements;
        log_pageReplacements = logPageReplacementsArray.reduce((acc, replaceObj) => {
            const key = Object.keys(replaceObj)[0];
            acc[key] = replaceObj[key];
            return acc;
        }, {});

        const logStatusTypesArray = data.logs.log_statusTypes;
        log_statusTypes = logStatusTypesArray.reduce((acc, statusTypeObj) => {
            const key = Object.keys(statusTypeObj)[0];
            acc[key] = statusTypeObj[key];
            return acc;
        }, {});

        log_pages = data.logs.log_pages;
        

    } catch (error) {
      console.error('Error loading JSON data:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadJSONData();
});

function loadLog(logName, element) {
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = 'Loading...';

    const logButtons = document.getElementById('LogButtons');
    const buttons = logButtons.querySelectorAll('div');
    buttons.forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    fetch(`php_server_data/load_log.php?log=${logName}`)
        .then(response => response.text())
        .then(data => {
            logContainer.innerHTML = formatLogContent(data, logName);
            logContainer.scrollTop = logContainer.scrollHeight;
        })
        .catch(error => {
            logContainer.innerHTML = 'Error loading log.';
            console.error('Error:', error);
        });
}
window.loadLog = loadLog;

function formatLogContent(data, logFileName) {
    const lines = data.split('\n');
    let formattedContent = '';
    let currentLogEntry = { date: '', page: '', status: '', text: '' };

    function addLogEntry() {
        if (currentLogEntry.date || currentLogEntry.page || currentLogEntry.status || currentLogEntry.text) {
            formattedContent += `<div class="log-entry">
                                    <div class="log-date">${currentLogEntry.date}</div>
                                    <div class="log-page">${currentLogEntry.page}</div>
                                    <div class="log-status">${currentLogEntry.status}</div>
                                    <div class="log-text">${currentLogEntry.text}</div>
                                 </div>`;
            currentLogEntry = { date: '', page: '', status: '', text: '' };
        }
    }

    lines.forEach(line => {
        if (line.startsWith('[')) {
            addLogEntry();
            const endIndex = line.indexOf(']') + 1;
            const dateTime = line.substring(1, endIndex - 1);

            let formattedDate = '', formattedTime = '';
            if (dateTime.includes('T')) {
                // Format: 2024-06-25T09:37:32.135
                const [date, time] = dateTime.split('T');
                formattedDate = date.split('-').reverse().join('.');
                formattedTime = time.split('.')[0];
            } else {
                // Format: 22-Jun-2024 22:58:12 Europe/Helsinki
                const [date, time] = dateTime.split(' ');
                const [day, month, year] = date.split('-');
                formattedDate = `${day}.${getMonthNumber(month)}.${year}`;
                formattedTime = time;
            }

            currentLogEntry.date = `<span style="color: ${log_colors.date};">${formattedDate}<br>${formattedTime}</span>`;
            let restOfLine = line.substring(endIndex);

            // Extract and colorize status            
            for (const status in log_statusTypes) {
                if (restOfLine.includes(status)) {
                    currentLogEntry.status = `<span style="color: ${log_colors[log_statusTypes[status]]};">${status}</span>`;
                    restOfLine = restOfLine.replace(status, '');
                    break;
                }
            }

            // Extract and colorize log_pages
            if (logFileName === 'CRM_WS') {
                currentLogEntry.page = `<span style="color: ${log_colors.pages};">SERVER</span>`;
                if (restOfLine.includes('CRM WebSoket - ')) {
                    restOfLine = restOfLine.replace('CRM WebSoket - ', '');
                }
                for (const key in log_pageReplacements) {
                    if (restOfLine.includes(key)) {
                        currentLogEntry.page = `<span style="color: ${log_colors.pages};">${log_pageReplacements[key]}</span>`;
                        restOfLine = restOfLine.replace(key, '');
                    }
                }
            } else {
                log_pages.forEach(page => {
                    if (restOfLine.includes(page)) {
                        currentLogEntry.page = `<span style="color: ${log_colors.pages};">${page}</span>`;
                        restOfLine = restOfLine.replace(page, '');
                    }
                });
            }

            // Check for "DataBase - NewDATA" and replace with "PRINT"
            if (restOfLine.includes('DataBase - ')) {
                currentLogEntry.page = `<span style="color: ${log_colors.pages};">ROUT</span>`;
                restOfLine = restOfLine.replace('DataBase - ', '');
            }

            // Check for "PHP Warning: " and handle accordingly
            if (restOfLine.includes('PHP Warning: ')) {
                currentLogEntry.page = `<span style="color: ${log_colors.pages};">PHP</span>`;
                currentLogEntry.status = `<span style="color: ${log_colors.warn};">[WARN]</span>`;
                restOfLine = restOfLine.replace('PHP Warning: ', '');
            }

            // Check for "PHP Fatal error: " and handle accordingly
            if (restOfLine.includes('PHP Fatal error: ')) {
                currentLogEntry.page = `<span style="color: ${log_colors.pages};">PHP</span>`;
                currentLogEntry.status = `<span style="color: ${log_colors.error};">[ERROR]</span>`;
                restOfLine = restOfLine.replace('PHP Fatal error: ', '');
            }

            // Highlight and remove separator |||
            if (restOfLine.includes('|||')) {
                const parts = restOfLine.split('|||');
                restOfLine = parts[0] + `<br><span style="color: ${log_colors.separator};">${parts[1]}</span>`;
            }

            currentLogEntry.text = restOfLine.trim();
        } else {
            if (line.startsWith('--->')) {
                currentLogEntry.text += `<br><span style="color: ${log_colors.arrow};">${line}</span>`;
            } else {
                currentLogEntry.text += `<br>${line}`;
            }
        }
    });

    // Add the last log entry
    addLogEntry();

    return formattedContent;
}

function getMonthNumber(month) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return months[month] || month;
}