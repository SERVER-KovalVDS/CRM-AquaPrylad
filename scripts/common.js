// ========== Отримання даних сесії у перемінні ========== 
    async function fetchSessionData() {
        try {
            const response = await fetch('../php_server_data/getSessionData.php');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const sessionData = await response.json();
            
            // Объявляем глобальные переменные и делаем их неизменяемыми
            Object.defineProperty(window, 'user_login', {
                value: sessionData.login,
                writable: false,
                configurable: false,
            });
            Object.defineProperty(window, 'user_city', {
                value: sessionData.city,
                writable: false,
                configurable: false,
            });
            Object.defineProperty(window, 'user_role', {
                value: sessionData.role,
                writable: false,
                configurable: false,
            });
            Object.defineProperty(window, 'user_pages', {
                value: sessionData.pages,
                writable: false,
                configurable: false,
            });
            Object.defineProperty(window, 'user_name', { 
                value: sessionData.user_name,
                writable: false,
                configurable: false,
            });
            Object.defineProperty(window, 'token', { 
                value: sessionData.user_token,
                writable: false,
                configurable: false,
            });

        } catch (error) {
            console.error('There has been a problem with your fetch operation:', error);
        }
    }
    window.fetchSessionData = fetchSessionData;

    // ========== Логування для JS ========== 
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
    window.logMessage = logMessage;

// ========== Блок бічної панелі ==========    
    let NavEscClose;
    function openNav() {
        var sidebar = document.getElementById("Sidebar");
        sidebar.classList.remove("hide");
        sidebar.classList.add("show");

        NavEscClose = createOnKeydownWrapper('closeNav');
        document.addEventListener('keydown', NavEscClose);
    }

    function closeNav() {
        var sidebar = document.getElementById("Sidebar");
        sidebar.classList.remove("show");
        sidebar.classList.add("hide");

        if (NavEscClose) {
            document.removeEventListener('keydown', NavEscClose);
            NavEscClose = null;
        }
    }

// ========== Відображення анімації ==========
    const animationPaths = {
        preloader: '../css/preloader.json',
        confirm: '../css/confirm.json',
        warning: '../css/warning.json',
        cancel: '../css/cancel.json',
        calendar: '../css/calendar.json',
        test1: '../css/test1.json'
    };

    let currentAnimation = null;
    function showAnimation(animationType, containerId = null, animationDuration = null) {
        let animationContainer;
        if (containerId) {
            animationContainer = document.getElementById(containerId);
        } else {
            animationContainer = document.getElementById('animation');
            const anContainer = document.getElementById('an-container');
            if (animationContainer && anContainer) {
                animationContainer.style.display = 'flex';
                animationContainer = anContainer;
            }
        }
        if (animationContainer && animationPaths[animationType]) {
            animationContainer.innerHTML = '';
            fetch(animationPaths[animationType])
                .then(response => response.json())
                .then(animationData => {
                    if (animationType != 'preloader') {
                        const newFr = getAdjustedFrameRate(animationData, animationDuration);
                        animationData.fr = newFr;
                    }
                    currentAnimation = lottie.loadAnimation({
                        container: animationContainer,
                        renderer: 'svg',
                        loop: true,
                        autoplay: true,
                        animationData: animationData
                    });
                });
        }
    }
    window.showAnimation = showAnimation;

    function hideAnimation(containerId = null) {
        let animationContainer;
        if (containerId) {
            animationContainer = document.getElementById(containerId);
        } else {
            animationContainer = document.getElementById('animation');
            if (animationContainer) {
                animationContainer.style.display = 'none';
            }
        }
    
        if (currentAnimation) {
            currentAnimation.destroy();
            currentAnimation = null;
        }
    }
    window.hideAnimation = hideAnimation;

    function getAdjustedFrameRate(animationData, targetDuration) {
        const totalFrames = animationData.op - animationData.ip;
        return totalFrames / targetDuration;
    }

    function createMarquee(element, message, spacing = 400, speed = 1.5) {
        if (element.isAnimating) {
            cancelAnimationFrame(element.animationFrameId);
            element.isAnimating = false;
            while (element.firstChild) {
                element.removeChild(element.firstChild);
            }
        }
        element.innerHTML = '';
        const containerWidth = element.offsetWidth;
        const textElement = document.createElement('div');
        textElement.innerHTML = message;
        textElement.style.position = 'absolute';
        textElement.style.whiteSpace = 'nowrap';
        document.body.appendChild(textElement);
        const textElementWidth = textElement.offsetWidth;
        document.body.removeChild(textElement);
        const totalWidth = textElementWidth + spacing;
        const count = Math.ceil(containerWidth / totalWidth) + 2;
        
        for (let i = 0; i < count; i++) {
            const clonedElement = textElement.cloneNode(true);
            clonedElement.style.left = `${containerWidth + i * totalWidth}px`;
            element.appendChild(clonedElement);
        }
        
        function animateMarquee() {
            if (!element.isAnimating) {
                return;
            }
            element.childNodes.forEach((child, index) => {
                const currentLeft = parseFloat(child.style.left);
                const newPosition = currentLeft - speed;
    
                if (newPosition < -totalWidth) {
                    const maxLeft = Math.max(...Array.from(element.childNodes).map(el => parseFloat(el.style.left)));
                    child.style.left = `${maxLeft + totalWidth}px`;
                } else {
                    child.style.left = `${newPosition}px`;
                }
            });
            element.animationFrameId = requestAnimationFrame(animateMarquee);
        }
    
        element.isAnimating = true;
        element.animationFrameId = requestAnimationFrame(animateMarquee);
    }
    window.createMarquee = createMarquee;

    function stopAndClose(closeBtn) {
        const alertContainer = closeBtn.parentElement;
        const messageElement = alertContainer.querySelector('.message');
        if (messageElement && messageElement.isAnimating) {
            cancelAnimationFrame(messageElement.animationFrameId);
            messageElement.isAnimating = false;
            while (messageElement.firstChild) {
                messageElement.removeChild(messageElement.firstChild);
            }
        }
        alertContainer.style.display = 'none';
    }
    window.stopAndClose = stopAndClose;

// ========== Підсвітка та форматування даних ==========
    function highlightMatch(text, query) {
        if (typeof text !== 'string') {
            text = text.toString();
        }
        const searchTerms = query.split(' ').filter(term => term.length > 0);
        let highlightedText = text;

        searchTerms.forEach(term => {
            const escapedTerm = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'gi');
            highlightedText = highlightedText.replace(regex, match => `<span class='highlight'>${match}</span>`);
        });
        return highlightedText;
    }
    window.highlightMatch = highlightMatch;

    function formatDate(dateString) {
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', options);
    }
    window.formatDate = formatDate;

    function PhoneNumberformat(phoneNumberString) {
        if (phoneNumberString === null) {
            return null;
        }
        const phoneNumbers = phoneNumberString.split('|');
        const formattedNumbers = phoneNumbers.map(phoneNumber => {
            if (phoneNumber.length === 10) {
                return `+38 (${phoneNumber.substring(0, 3)}) ${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6, 8)}-${phoneNumber.substring(8, 10)}`;
            } else if (phoneNumber.length === 6) {
                return `+38 (0462) ${phoneNumber.substring(0, 2)}-${phoneNumber.substring(2, 4)}-${phoneNumber.substring(4, 6)}`;
            } else {
                return phoneNumber;
            }
        });
        return formattedNumbers.join('\n');
    }
    window.PhoneNumberformat = PhoneNumberformat;

    function formatValue(value) {
        return value.toString().padStart(5, '0');
    }
    window.formatValue = formatValue;
    
    function formatCost(cost) {
        return cost.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,') + ' грн.';
    }
    window.formatCost = formatCost;

    function getValueOrDefault(value) {
        return (value === null || value === undefined || value === '' || value === ', ' || value === 0) ? '<div class="no-data">Дані відсутні</div>' : value;
    }
    window.getValueOrDefault = getValueOrDefault;

    function showModalMessage(blockId, classNamePart, message, timeout) {
        const targetBlock = document.getElementById(blockId);
        if (!targetBlock) {
            console.error(`Element with id ${blockId} not found.`);
            return;
        }
        const messageDiv = document.createElement('div');
        messageDiv.className = `${classNamePart}-modal_field`;
        const countdownDiv = document.createElement('div');
        countdownDiv.innerHTML = `<p>${message}</p><hr><span class="countdown_modal_text">повідомлення зникне через <span class="countdown_modal_msg">${timeout / 1000}</span> сек.</span>`;
        messageDiv.appendChild(countdownDiv);
        messageDiv.setAttribute('data-temporary-block-message', '');
        messageDiv.onclick = () => {
            messageDiv.remove();
        };
        targetBlock.insertAdjacentElement('afterend', messageDiv);
        const countdownElement = messageDiv.querySelector('.countdown_modal_msg');
        let remainingTime = timeout / 1000;
        const countdownInterval = setInterval(() => {
            if (!messageDiv.parentElement) {
                clearInterval(countdownInterval);
                return;
            }
            remainingTime--;
            if (remainingTime >= 0) {
                countdownElement.textContent = remainingTime;
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
        setTimeout(() => {
            clearInterval(countdownInterval);
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, timeout);
    }
    window.showModalMessage = showModalMessage;

// ========== Робота з вкладками модальних вікон ==========
    let visibleTabsCount = null;
    window.addEventListener('resize', adjustTabs);
    function adjustTabs() {
        const containerWidth = window.innerWidth;
        const tabWidth = 350;
        let newVisibleTabsCount = Math.floor((containerWidth - 25) / tabWidth);

        if (newVisibleTabsCount !== visibleTabsCount) {
            updateVisibleTabs(newVisibleTabsCount);
        }
    }
    window.adjustTabs = adjustTabs;

    function updateVisibleTabs(newVisibleTabsCount) {
        visibleTabsCount = newVisibleTabsCount;
        const containers = document.getElementsByClassName('tab-container');

        for (let i = 0; i < containers.length; i++) {
            const container = containers[i];
            const tablinks = container.getElementsByClassName('tablinks');
            const actualTabsCount = tablinks.length;
            const tabsToShow = Math.min(visibleTabsCount, actualTabsCount);
            container.style.width = (tabsToShow * 350) + 'px';
            openTab(null, null, container.id);
        }
    }
    window.updateVisibleTabs = updateVisibleTabs;

    function openTab(evt, tabName, containerId) {
        const container = document.getElementById(containerId);
        const tabcontent = container.getElementsByClassName("tabcontent");
        const tablinks = container.getElementsByClassName("tablinks");
        
        if (evt === null && tabName === null) {
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].classList.remove('active');
                tabcontent[i].style.display = 'none';
            }
            for (let i = 0; i < visibleTabsCount && i < tablinks.length; i++) {
                tablinks[i].classList.add('active');
                tabcontent[i].style.display = 'block';
            }
        } else {
            const clickedIndex = Array.from(tablinks).indexOf(evt.currentTarget);
            if (tablinks[clickedIndex].classList.contains('active')) {
                return;
            }
            for (let i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            for (let i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            let tabsToShow = visibleTabsCount;
            let shownTabs = 0;
        
            for (let i = 0; i < tabsToShow; i++) {
                if (clickedIndex - i >= 0) {
                    tablinks[clickedIndex - i].classList.add('active');
                    tabcontent[clickedIndex - i].style.display = 'block';
                    shownTabs++;
                } else {
                    break;
                }
            }
            tabsToShow = visibleTabsCount - shownTabs;
            for (let i = 1; i <= tabsToShow; i++) {
                if (clickedIndex + i < tablinks.length) {
                    tablinks[clickedIndex + i].classList.add('active');
                    tabcontent[clickedIndex + i].style.display = 'block';
                }
            }
        }
    }
    window.openTab = openTab;

// ========== Інші функції ==========
    function onEscKeydown(event, fn_name, page_name = null) {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (typeof window[fn_name] === 'function') {
                window[fn_name](page_name);
            } else {
                console.error(`Function ${fn_name} not found`);
            }
        }
    }

    function createOnKeydownWrapper(fn_name, page_name = null) {
        return function(event) {
            onEscKeydown(event, fn_name, page_name);
        };
    }
    window.createOnKeydownWrapper = createOnKeydownWrapper;

    function closeAllAlerts() {
        const alertMessage = document.getElementById('alertMessage');
        const warningMessage = document.getElementById('warningMessage');
        const infoMessage = document.getElementById('infoMessage');
        if (alertMessage) {
            stopAndClose(alertMessage.parentElement.querySelector('.closebtn'));
        }
        if (warningMessage) {
            stopAndClose(warningMessage.parentElement.querySelector('.closebtn'));
        }
        if (infoMessage) {
            stopAndClose(infoMessage.parentElement.querySelector('.closebtn'));
        }
    }
    window.closeAllAlerts = closeAllAlerts;

    function closeAllCards(pageType) {
        document.getElementById('adrCRDform').classList.remove('show');
        document.getElementById('MetersForm').classList.remove('show');
        document.getElementById('TasksForm').classList.remove('show');
        closeFilterForm ('ALL');

        const elements = document.querySelectorAll('.navi_grid2, .navi_grid3, .navi_grid4');
        elements.forEach(element => {
            element.style.display = 'none';
        });

        if (pageType === 'ADDRESSES' || pageType === 'METERS' || pageType === 'TASKS') {
            closeSearchForm();
            document.getElementById("AddNewADR").classList.remove("show");
            document.getElementById("AddNewMeter").classList.remove("show");
            document.getElementById("AddNewTask").classList.remove("show");
        }
    }
    window.closeAllCards = closeAllCards;

    function handleBlockClick(event) {
        const target = event.currentTarget;
        const parentBlock = target.parentElement;
        if (!parentBlock) return;
        const blocks = parentBlock.children;
        Array.from(blocks).forEach(block => {
            block.classList.remove('active');
        });
        target.classList.add('active');
    }
    window.handleBlockClick = handleBlockClick;

    function manageAutocompleteListeners(action, windowId) {
        function closeAllDropdownsExceptCurrent(event) {
            const windowElement = document.getElementById(windowId);
            if (!windowElement) return;
    
            windowElement.querySelectorAll('.autocomplete-list, .calendar-container').forEach(container => {
                if (!container.contains(event.target) && !container.previousElementSibling.contains(event.target)) {
                    container.style.display = 'none';
                }
            });
        }
    
        if (action === 'add') {
            document.addEventListener('click', closeAllDropdownsExceptCurrent);
        } else if (action === 'remove') {
            document.removeEventListener('click', closeAllDropdownsExceptCurrent);
            const windowElement = document.getElementById(windowId);
            if (windowElement) {
                windowElement.querySelectorAll('.autocomplete-list, .calendar-container').forEach(container => {
                    container.style.display = 'none';
                });
            }
        }
    }
    window.manageAutocompleteListeners = manageAutocompleteListeners;

    function handleConnectionCloseMessage(code, container) {
        const MSGcontainer = document.getElementById(container);
        if (!MSGcontainer) {
            console.error('Container element not found');
            return;
        }
        let close_reason = '';
        let close_text1 = '';
        switch (code) {
            case 4000:
                close_reason = 'Сервер закрив зʼєднання через відсутність активності користувача!';
                close_text1 = 'Для повторного зʼєднання і отримання даних, потрібно оновити сторінку.';
                break;
            default:
                close_reason = 'Сервер закрив зʼєднання!';
                close_text1 = 'Спробуйте перейти на ГОЛОВНУ сторінку, а потім повернутися на сторінку Лічильників.<br>Якщо проблема не знакає, зверніться до адміністратора.';
                break;
        }
        MSGcontainer.innerHTML = ` <br>
                                <div class="alert" style="display: block">
                                    <div class="server_alert_title">
                                        П О М И Л К А !!!<br>
                                        ${close_reason}
                                    </div>
                                    <br>
                                    <div class="server_alert_text">
                                        ${close_text1}
                                    </div>
                                </div>`;
    }
    window.handleConnectionCloseMessage = handleConnectionCloseMessage;