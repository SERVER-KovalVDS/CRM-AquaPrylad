import { connectWebSocket, sendWebSocketMessage } from './websocket.js';

// document.addEventListener('DOMContentLoaded', function() {
//     const alertContainer = document.querySelector('.alert');
//     const alertMessage = document.getElementById('alertMessage');
//     if (alertContainer && alertMessage) {
//         const message = `<strong>УВАГА!</strong> Сторінка знаходиться у розробці.`;
//         alertMessage.innerHTML = message;
//         alertContainer.style.display = 'flex';
//         createMarquee(alertMessage, message);
//     }

// });

const calendar = new RangeSelectionCalendar(calendarContainer, dateRangeInput);

async function initialize() {
    await fetchSessionData();
    try {
        await connectWebSocket(token, 'CHERNIGIV-REPORTS', handleServerData, handleConnectionClose);
    } catch (error) {
        console.error('Failed to connect:', error);
        hideAnimation();
    }
}
initialize();

function showCalendar() {
    const calendarContainer = document.getElementById('calendarContainer');
    const balancerContainer = document.getElementById('balancerContainer');
    const dateRangeInput = document.getElementById('dateRangeInput');
    const generateReportButton = document.getElementById('GenerateReport');
    const downloadExcelButton = document.getElementById('DownloadReport');
    calendar.setAvailableDates([]);
    calendar.buildCalendar();
    calendarContainer.style.display = 'block';
    balancerContainer.style.display = 'block';
    dateRangeInput.style.display = 'block';
    generateReportButton.style.display = 'block';
    downloadExcelButton.style.display = 'none';
}
window.showCalendar = showCalendar;

function generateReport() {
    const dateRangeInput = document.getElementById('dateRangeInput');
    const calendarContainer = document.getElementById('calendarContainer');
    const generateReportButton = document.getElementById('GenerateReport');
    const downloadExcelButton = document.getElementById('DownloadReport');
    const balancerContainer = document.getElementById('balancerContainer');
    const messageBlock = document.getElementById('report_message_block');
    const activeBlock = balancerContainer.querySelector('.button-block.active');

    const dateRange = dateRangeInput.dataset.serverValue;
    if (dateRange) {
        const [startDate, endDate] = dateRange.split(' => ');

        if (messageBlock.innerHTML.trim() !== '') {
            return;
        } else if (!activeBlock) {
            showMessage("Необхідно обрати постачальника послуг", "warning_message");
            return;
        }

        const balancerType = activeBlock.innerText;
        const criteria = [startDate, endDate, balancerType];

        sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "reports", table: "generate", criteria: criteria } }));
        // showAnimation('preloader');

        calendarContainer.style.display = 'none';
        balancerContainer.style.display = 'none';
        dateRangeInput.style.display = 'none';
        dateRangeInput.value = '';
        dateRangeInput.dataset.serverValue = '';
        generateReportButton.style.display = 'none';
        downloadExcelButton.style.display = 'block';
    }
}
window.generateReport = generateReport;

function handleServerData(event) {
    const data3 = JSON.parse(event.data);
    // console.log('Server response: ', data3);
    const messageBlock = document.getElementById('report_message_block');
    const progressBar = document.getElementById('progress-bar');
    const progressBarFill = document.getElementById('progress-bar-fill');
    let messages = '';

    switch (data3.action) {
        case "CalendarDatesResponse":
            // console.log('CalendarDatesResponse: ', data3);
            hideAnimation('calendarContainer');
            const availableDates = data3.calendar_dates.map(item => new Date(item));
            calendar.setAvailableDates(availableDates);        
            break;
        case "reportResponse":
            // console.log('CalendarDatesResponse: ', data3);
            switch (data3.status) {
                case 'progress':
                    progressBar.style.display = 'block';
                    progressBarFill.style.width = `${data3.progress}%`;
                    progressBarFill.textContent = `${data3.progress}%`;
                    break;

                case 'success':
                    messages += `<div class='message_text info_message'><div>${data3.message}</div></div>`;
                    messages += `<div class='message_text info_message'><div>Записів завантажено: ${data3.row_count}</div></div>`;
            
                    let count_text;
                    let row_count = data3.row_count;
                    let lastDigit = row_count % 10;
                    let lastTwoDigits = row_count % 100;
                    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
                        count_text = 'записів';
                    } else {
                        switch (lastDigit) {
                            case 1:
                                count_text = 'запис';
                                break;
                            case 2:
                            case 3:
                            case 4:
                                count_text = 'записи';
                                break;
                            default:
                                count_text = 'записів';
                        }
                    }
                    logMessage('reports', 'LoadOUT', '[INFO]', `Користувачем [${user_name}] сформовано звіт з бази даних на ${data3.row_count} ${count_text} у файл [${data3.file_name}]`);
                    const byteCharacters = atob(data3.file_content);
                    const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'text/csv;charset=utf-8;' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = data3.file_name;
                    document.body.appendChild(a);
                    a.click();
            
                    window.URL.revokeObjectURL(url);
                    break;
                case 'warning':
                    messages += `<div class='message_text warning_message'><div>${data3.message}</div></div>`;
                    break;
                case 'error':
                    messages += `<div class='message_text alarm_message'><div>${data3.message}</div></div>`;
                    break;
            }
            if(data3.status !== 'progress') {
                messageBlock.innerHTML = messages || "<div class='message_text alarm_message'><div>Помилка отримання даних з серверу</div></div>";
                createCountdownBlock(messageBlock);
                // hideAnimation();
                progressBar.style.display = 'none';
            }
            
            break;
        default:
            console.error(`Unknown action for Reports: ${data3.action}. Message: ${data3.message}`);
            break;
    }
}

function handleConnectionClose(code) {
    handleConnectionCloseMessage(code, 'reports-container');
    hideAnimation();
}

function showMessage(message, type) {
    const messageBlock = document.getElementById('report_message_block');
    messageBlock.innerHTML = `<div class='message_text ${type}'><div>${message}</div></div>`;
    createCountdownBlock(messageBlock);
}

let upload_message_block_clearInterval;
let report_message_block_clearInterval;
function createCountdownBlock(messageBlock) {
    switch(messageBlock.id) {
        case 'upload_message_block':
            const UploadCountdownBlock = document.getElementById('upload-countdown');
            let upload_message_countdown = 10;
            upload_message_block_clearInterval = setInterval(function() {
                upload_message_countdown--;
                UploadCountdownBlock.textContent = "Повідомлення зникнуть через: " + upload_message_countdown + " сек.";
                if (upload_message_countdown <= 0) {
                    clearReportMessageBlock_onClick('upload_message_block')
                }
            }, 1000);
            break;
        case 'report_message_block':
            const hrBefore = document.createElement('hr');
            hrBefore.style.width = '100%';
            const hrAfter = document.createElement('hr');
            hrAfter.style.width = '100%';
            const ReportCountdownBlock = document.createElement('div');
            ReportCountdownBlock.id = 'report-countdown';
            ReportCountdownBlock.className = 'countdown_clear_message';
            ReportCountdownBlock.style.textAlign = 'center';
            ReportCountdownBlock.style.fontSize = '12px';
            ReportCountdownBlock.textContent = 'Повідомлення зникнуть через: 10 сек.';
        
            messageBlock.appendChild(hrBefore);
            messageBlock.appendChild(ReportCountdownBlock);
            messageBlock.appendChild(hrAfter);
            let report_message_countdown = 10;
            report_message_block_clearInterval = setInterval(function() {
                report_message_countdown--;
                ReportCountdownBlock.textContent = "Повідомлення зникнуть через: " + report_message_countdown + " сек.";
                if (report_message_countdown <= 0) {
                    clearReportMessageBlock_onClick('report_message_block')
                }
            }, 1000);
            break;
    }
}
window.createCountdownBlock = createCountdownBlock;

function clearReportMessageBlock_onClick(blockID) {
    const messageBlock = document.getElementById(blockID);
    messageBlock.innerHTML = '';

    if(blockID === 'report_message_block') {
        clearInterval(report_message_block_clearInterval);
        const balancerContainer = document.getElementById('balancerContainer');
        const buttonBlocks = balancerContainer.querySelectorAll('.button-block');
        buttonBlocks.forEach(block => {
            block.classList.remove('active');
            block.classList.add('inactive');
        });
    } else if(blockID === 'upload_message_block') {
        clearInterval(upload_message_block_clearInterval);
    }
}
window.clearReportMessageBlock_onClick = clearReportMessageBlock_onClick;

function activate_balancerBlock(blockId) {
    const calendarContainer = document.getElementById('calendarContainer');
    const dateRangeInput = document.getElementById('dateRangeInput');
    calendarContainer.style.display = 'block';
    dateRangeInput.value = '';
    calendar.clearSelection();
    let blocks = document.querySelectorAll('#balancerContainer .button-block');
    blocks.forEach(function(block) {
        block.classList.remove('active');
        block.classList.add('inactive');
    });
    let activeBlock = document.getElementById(blockId);
    activeBlock.classList.add('active');
    activeBlock.classList.remove('inactive');

    let criteria = activeBlock.innerText;
    sendWebSocketMessage(JSON.stringify({ action: "chernigiv", parameters: { page: "reports", table: "calendar", criteria: criteria } }));
    showAnimation('calendar', 'calendarContainer');
}
window.activate_balancerBlock = activate_balancerBlock;