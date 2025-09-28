const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');
const archiveDir = path.join(logsDir, 'archive');

const dateRegex1 = /^\[(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}\.\d{3}\]/;
const dateRegex2 = /^\[(\d{2})-(\w{3})-(\d{4}) \d{2}:\d{2}:\d{2}/;

function getTodaysDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

function convertDateFormat(day, month, year) {
    const months = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    return `${year}-${months[month]}-${day}`;
}

function extractDate(line) {
    const match1 = line.match(dateRegex1);
    if (match1) return match1[1];

    const match2 = line.match(dateRegex2);
    if (match2) return convertDateFormat(match2[1], match2[2], match2[3]);

    return null;
}

function processLogs() {
    const files = fs.readdirSync(logsDir);
    const todaysDate = getTodaysDate();

    files.forEach(file => {
        const filePath = path.join(logsDir, file);
        if (fs.lstatSync(filePath).isFile() && path.extname(file) === '.log') {
            const data = fs.readFileSync(filePath, 'utf8');
            if (!data.trim()) {
                return;
            }

            const lines = data.split('\n');
            let currentDate = null;
            let linesToArchive = [];
            let remainingLines = [];
            let archiveFilePath = null;
            let isToday = false;

            lines.forEach(line => {
                const date = extractDate(line);

                if (date) {
                    if (date !== todaysDate) {
                        if (!currentDate || date !== currentDate) {
                            if (linesToArchive.length > 0) {
                                if (fs.existsSync(archiveFilePath)) {
                                    fs.appendFileSync(archiveFilePath, linesToArchive.join('\n') + '\n');
                                } else {
                                    fs.writeFileSync(archiveFilePath, linesToArchive.join('\n') + '\n');
                                }
                            }
                            linesToArchive = [];
                            currentDate = date;
                            archiveFilePath = path.join(archiveDir, path.basename(file, '.log'), `${path.basename(file, '.log')}_${currentDate}.log`);
                        }
                        linesToArchive.push(line);
                    } else {
                        isToday = true;
                        remainingLines.push(line);
                    }
                } else {
                    if (isToday) {
                        remainingLines.push(line);
                    } else {
                        linesToArchive.push(line);
                    }
                }
            });

            if (linesToArchive.length > 0 && archiveFilePath) {
                if (fs.existsSync(archiveFilePath)) {
                    fs.appendFileSync(archiveFilePath, linesToArchive.join('\n') + '\n');
                } else {
                    fs.writeFileSync(archiveFilePath, linesToArchive.join('\n') + '\n');
                }
            }

            fs.writeFileSync(filePath, remainingLines.join('\n'));
        }
    });
}

processLogs();