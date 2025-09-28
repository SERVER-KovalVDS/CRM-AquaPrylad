document.addEventListener('DOMContentLoaded', function () {
    var htmlToken = document.getElementById('token_for_cleaning_cash').innerText;
    var CashCleaningToken = "token175801102024";

    if (htmlToken !== CashCleaningToken) {
        console.log('CASH need to be cleared!');

        createWarningPopup();
        
    }

});

function createWarningPopup() {
    var popupContainer = document.createElement('div');
    popupContainer.style.position = 'absolute';
    popupContainer.style.top = '0';
    popupContainer.style.left = '0';
    popupContainer.style.width = '100%';
    popupContainer.style.height = '100%';
    popupContainer.style.background = 'rgba(0, 0, 0, 0.8)';
    popupContainer.style.color = 'red';
    popupContainer.style.display = 'flex';
    popupContainer.style.alignItems = 'center';
    popupContainer.style.justifyContent = 'center';
    popupContainer.style.zIndex = '9999';
    var popupText = document.createElement('p');
    popupText.innerHTML = 'УВАГА!!!\nСистема була оновлена.<br>Для корректної роботи потрібно очистити<br>КЕШ та файли COOKIE у Вашому браузері.<br><a href="https://support.google.com/accounts/answer/32050?hl=uk&co=GENIE.Platform%3DDesktop&oco=0" style="color: var(--pasive-color);">Очистка у Google Chrome</a>';
    popupText.style.fontSize = '24px';
    popupText.style.textAlign = 'center';
    popupText.style.fontFamily = "'IBM Plex Mono', monospace";
    popupContainer.appendChild(popupText);
    document.body.appendChild(popupContainer);
}
