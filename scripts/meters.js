import { connectWebSocket, sendWebSocketMessage } from './websocket.js';

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

connectWebSocket(token, 'SUMY-METERS', handleServerData, handleConnectionClose).then(() => {
    showAnimation('preloader');
    sendWebSocketMessage(JSON.stringify({ action: "sumy", parameters: { page: "meters", table: "meters" } }));
}).catch(error => {
    console.error('Failed to connect:', error);
    hideAnimation();
});

var dataFromDB = [];

function handleServerData(event) {
    const data = JSON.parse(event.data);
    dataFromDB = data.data;
    // console.info('Server: '+event.data)

    if (data.action === "metersResponse") {
        displayDataOnPage(dataFromDB);
    }
}

function handleConnectionClose(page) {
    const container = document.getElementById('meters-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }
    container.innerHTML = ` <br>
                            <div class="alert">
                                <div class="server_alert_title">
                                    П О М И Л К А !!!<br>Сервер закрив зʼєднання!
                                </div>
                                <br>
                                <div class="server_alert_text">
                                    Спробуйте перейти на ГОЛОВНУ сторінку, а потім повернутися на сторінку Лічильників.<br>Якщо проблема не знакає, зверніться до адміністратора.
                                </div>
                            </div>`;
    hideAnimation();
}

function displayDataOnPage(data) {
    const container = document.getElementById('meters-container');
    if (!container) {
        console.error('Container element not found');
        return;
    }

    container.innerHTML = '';

    const fieldLabels = {
        location: 'Розміщення',
        balanser: 'Баланс',
        result: 'Придатність',
        status: 'Статус',
        address: 'Адреса'
    };

    data.forEach(meter => {
        const columnDiv = document.createElement('div');
        columnDiv.className = 'page_column';

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('page_card');     

        const headerDiv = document.createElement('div');
        headerDiv.className = 'page_card_title';
        
        const numberDiv = document.createElement('div');
        numberDiv.textContent = meter.number || 'Не вказано';
        numberDiv.style.fontWeight = 'bold';
        numberDiv.style.fontSize = '120%';
        numberDiv.style.textAlign = 'center';
        headerDiv.appendChild(numberDiv);
        
        const typeDiv = document.createElement('div');
        typeDiv.textContent = meter.type && meter.type.name ? meter.type.name : 'Не вказано';
        typeDiv.style.fontWeight = 'bold';
        typeDiv.style.fontSize = '120%';
        typeDiv.style.textAlign = 'center';
        headerDiv.appendChild(typeDiv);
        
        cardDiv.appendChild(headerDiv);

        Object.keys(fieldLabels).forEach(field => {
            const fieldDiv = document.createElement('div');
            fieldDiv.className = 'page_card_value';
            fieldDiv.setAttribute('data-label', fieldLabels[field] + ':');

            if (field === 'address' && meter.address) {
                const streetDiv = document.createElement('div');
                streetDiv.textContent = meter.address.street || 'Не вказано';

                const addressDetailsDiv = document.createElement('div');
                let addressDetails = `буд. ${meter.address.building}`;
                if (meter.address.building2 && meter.address.building2 !== "0") {
                    addressDetails += `, корп. ${meter.address.building2}`;
                }
                if (meter.address.flat_or_office) {
                    addressDetails += (meter.address.flat_or_office !== "п/сектор" ? `, кв. ${meter.address.flat_or_office}` : `, ${meter.address.flat_or_office}`);
                }
                addressDetailsDiv.textContent = addressDetails;

                fieldDiv.appendChild(streetDiv);
                fieldDiv.appendChild(addressDetailsDiv);
            } else {
                fieldDiv.textContent = meter[field] != null && meter[field] !== '' ? meter[field] : 'Не вказано';
            }

            cardDiv.appendChild(fieldDiv);
        });

        columnDiv.appendChild(cardDiv);
        container.appendChild(columnDiv);
    });

    hideAnimation();
}