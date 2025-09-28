function logMessage(logFile, pageType, logLevel, logMessage) {
    const logData = {
        logFile,
        pageType,
        logLevel,
        logMessage
    };

    fetch('./php_functions.php', {
        method: 'POST',
        body: JSON.stringify(logData),
        headers: {'Content-Type': 'application/json'}
    }).catch(error => console.error('Log sending error:', error));
}