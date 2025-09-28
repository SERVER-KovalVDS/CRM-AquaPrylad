class CustomCalendar {
    constructor(calendarContainer) {
        this.calendarContainer = calendarContainer;
        this.currentDate = new Date();
        this.availableDates = [];
        this.buildCalendar();
    }

    setAvailableDates(dates) {
        this.availableDates = dates.filter(date => !isNaN(date));
        this.setMaxDateAsCurrent();
        this.buildCalendar();
    }

    buildCalendar() {
        this.calendarContainer.innerHTML = '';
        const controls = document.createElement('div');
        controls.className = 'calendar-controls';
        const prevButton = document.createElement('button');
        prevButton.textContent = '\u2190';
        prevButton.type = 'button';
        prevButton.onclick = (event) => {
            event.stopPropagation();
            this.changeMonth(-1);
        };
        const nextButton = document.createElement('button');
        nextButton.textContent = '\u2192';
        nextButton.type = 'button';
        nextButton.onclick = (event) => {
            event.stopPropagation();
            this.changeMonth(1);
        };
        const monthDisplay = document.createElement('span');
        monthDisplay.className = 'month-display';
        monthDisplay.textContent = this.currentDate.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' });
        controls.appendChild(prevButton);
        controls.appendChild(monthDisplay);
        controls.appendChild(nextButton);
        this.calendarContainer.appendChild(controls);

        const daysOfWeek = document.createElement('div');
        daysOfWeek.className = 'days-of-week';
        ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].forEach(day => {
            const dayElement = document.createElement('span');
            dayElement.textContent = day;
            daysOfWeek.appendChild(dayElement);
        });
        this.calendarContainer.appendChild(daysOfWeek);

        this.daysContainer = document.createElement('div');
        this.daysContainer.className = 'days-container';
        this.calendarContainer.appendChild(this.daysContainer);

        this.renderDays();
    }

    changeMonth(change) {
        this.currentDate.setMonth(this.currentDate.getMonth() + change);
        this.buildCalendar();
    }

    updateButtonClass(button, className) {
        button.classList.remove('calendar-day-green', 'calendar-day-orange', 'calendar-day-red', 'calendar-day-grey', 'inactive');
        button.classList.add(className);
    }

    renderDays() {
        this.daysContainer.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay() || 7;
        for (let i = 1; i < startDayOfWeek; i++) {
            const emptyDay = document.createElement('span');
            this.daysContainer.appendChild(emptyDay);
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('button');
            dayElement.textContent = day;
            dayElement.type = 'button';
            const dateString = new Date(Date.UTC(year, month, day)).toISOString().split('T')[0];
            const currentDate = new Date(Date.UTC(year, month, day));
            if (this.availableDates.some(date => date.toISOString().split('T')[0] === dateString)) {
                dayElement.classList.add('active');
            } else {
                dayElement.classList.add('inactive');
                dayElement.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                };
            }
            this.daysContainer.appendChild(dayElement);
        }
    }
}

class RangeSelectionCalendar extends CustomCalendar {
    constructor(calendarContainer, input) {
        super(calendarContainer);
        this.input = input;
        this.startDate = null;
        this.endDate = null;
        this.isSelectingStart = true;
        this.setMaxDateAsCurrent();
        this.renderDays();
    }

    setMaxDateAsCurrent() {
        if (this.availableDates.length > 0) {
            const maxDate = new Date(Math.max.apply(null, this.availableDates.map(date => date.getTime())));
            this.currentDate = new Date(maxDate.getFullYear(), maxDate.getMonth());
        }
    }

    renderDays() {
        super.renderDays();
        const buttons = this.daysContainer.querySelectorAll('button');
        buttons.forEach(button => {
            const date = new Date(Date.UTC(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(button.textContent)));
            if (this.availableDates.some(availDate => availDate.getTime() === date.getTime())) {
                // button.classList.add('calendar-day-orange');
                this.updateButtonClass(button, 'calendar-day-orange');
                button.onclick = (event) => this.handleDateClick(date, event);
                button.onmouseover = () => this.handleMouseOver(date);
                button.onmouseleave = () => this.handleMouseLeave(date);
            } else {
                button.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                };
            }
        });
    }

    handleDateClick(date, event) {
        event.stopPropagation();
        if (this.isSelectingStart) {
            this.startDate = date;
            this.endDate = null;
            this.isSelectingStart = false;
            this.renderDays();
        } else if (date >= this.startDate) {
            if ((date - this.startDate) <= (30 * 24 * 60 * 60 * 1000)) {
                this.endDate = date;
                this.isSelectingStart = true;
                this.renderDays();
                this.updateInput();
                this.hideCalendar();
            } else {
                alert('Діапазон вибору може бути не більше 30 днів!');
            }
        } else {
            alert('Дата кінця діапазону не може бути раніше дати початку діапазону!');
        }
    }

    handleMouseOver(date) {
        if (!this.startDate) return;
        const buttons = this.daysContainer.querySelectorAll('button');
        buttons.forEach(button => {
            const buttonDate = new Date(Date.UTC(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(button.textContent)));
            if (this.startDate && this.endDate === null) {
                if (buttonDate.getTime() >= this.startDate.getTime() && buttonDate.getTime() <= date.getTime()) {
                    if (this.availableDates.some(availDate => availDate.getTime() === buttonDate.getTime())) {
                        this.updateButtonClass(button, 'calendar-day-green');
                    }
                } else if (buttonDate.getTime() <= this.startDate.getTime() && buttonDate.getTime() >= date.getTime()) {
                    if (this.availableDates.some(availDate => availDate.getTime() === buttonDate.getTime())) {
                        this.updateButtonClass(button, 'calendar-day-red');
                    }
                } else if (this.availableDates.some(availDate => availDate.getTime() === buttonDate.getTime())) {
                    this.updateButtonClass(button, 'calendar-day-orange');
                }
            }
        });
    }

    handleMouseLeave(date) {
        if (!this.startDate) return;

        const buttons = this.daysContainer.querySelectorAll('button');
        buttons.forEach(button => {
            const buttonDate = new Date(Date.UTC(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(button.textContent)));
            button.classList.remove('calendar-day-green', 'calendar-day-red');
            if (this.availableDates.some(availDate => availDate.getTime() === buttonDate.getTime())) {
                this.updateButtonClass(button, 'calendar-day-orange');
            }
        });
        if (this.startDate) {
            const startButton = [...buttons].find(button => {
                const buttonDate = new Date(Date.UTC(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(button.textContent)));
                return buttonDate.getTime() === this.startDate.getTime();
            });
            if (startButton) this.updateButtonClass(startButton, 'calendar-day-green');
        }
    }

    updateInput() {
        const formatDateForDisplay = date => {
            return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
        };

        if (this.startDate && this.endDate) {
            this.input.value = `${formatDateForDisplay(this.startDate)} => ${formatDateForDisplay(this.endDate)}`;
            this.input.dataset.serverValue = `${this.startDate.toISOString().split('T')[0]} => ${this.endDate.toISOString().split('T')[0]}`;
        } else if (this.startDate) {
            this.input.value = formatDateForDisplay(this.startDate);
            this.input.dataset.serverValue = this.startDate.toISOString().split('T')[0];
        } else {
            this.input.value = '';
            this.input.dataset.serverValue = '';
        }
    }

    clearSelection() {
        this.startDate = null;
        this.endDate = null;
        this.isSelectingStart = true;
        this.renderDays();
    }

    hideCalendar() {
        this.calendarContainer.style.display = 'none';
    }
}

class SingleDateSelectionCalendar extends CustomCalendar {
    constructor(calendarContainer, dateBlockId, activeDates, valueDates, currentWorkDate) {
        super(calendarContainer);
        this.selectedDate = currentWorkDate;
        this.dateBlockId = dateBlockId;
        this.activeDates = activeDates;
        this.valueDates = valueDates;
        this.currentWorkDate = currentWorkDate;
        this.setMaxDateAsCurrent();
        this.renderDays();
    }

    setMaxDateAsCurrent() {
        if (this.currentWorkDate) {
            this.currentDate = new Date(this.currentWorkDate.getFullYear(), this.currentWorkDate.getMonth());
        } else if (this.valueDates && this.valueDates.length > 0) {
            const maxValueDate = new Date(Math.max.apply(null, this.valueDates.map(date => date.getTime())));
            this.currentDate = new Date(maxValueDate.getFullYear(), maxValueDate.getMonth());
        } else if (this.activeDates && this.activeDates !== 'ALL' && this.activeDates.length > 0) {
            const maxActiveDate = new Date(Math.max.apply(null, this.activeDates.map(date => date.getTime())));
            this.currentDate = new Date(maxActiveDate.getFullYear(), maxActiveDate.getMonth());
        } else {
            this.currentDate = new Date();
        }
    }

    renderDays() {
        super.renderDays();
        const buttons = this.daysContainer.querySelectorAll('button');
        buttons.forEach(button => {
            const date = new Date(Date.UTC(this.currentDate.getFullYear(), this.currentDate.getMonth(), parseInt(button.textContent)));
            let isActiveDate = false;
            if (this.activeDates === 'ALL') {
                isActiveDate = true;
            } else if (Array.isArray(this.activeDates)) {
                isActiveDate = this.activeDates.some(availDate => availDate.getTime() === date.getTime());
            }
    
            const isValueDate = Array.isArray(this.valueDates) && this.valueDates.some(valDate => valDate.getTime() === date.getTime());
            if (isValueDate) {
                this.updateButtonClass(button, 'calendar-day-orange');
                button.onclick = (event) => this.handleDateClick(date, event);
            } else if (isActiveDate) {
                this.updateButtonClass(button, 'calendar-day-grey');
                button.onclick = (event) => this.handleDateClick(date, event);
            } else {
                button.onclick = null;
            }
    
            if (this.currentWorkDate) {
                const currentWorkDateUTC = Date.UTC(this.currentWorkDate.getFullYear(), this.currentWorkDate.getMonth(), this.currentWorkDate.getDate());
                const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    
                if (dateUTC === currentWorkDateUTC) {
                    this.updateButtonClass(button, 'calendar-day-green');
                }
            }
    
            if (date.getTime() === this.selectedDate?.getTime()) {
                this.updateButtonClass(button, 'calendar-day-green');
            }
        });
    }

    handleDateClick(date, event) {
        event.stopPropagation();
        const isActiveDate = this.activeDates === 'ALL' || (Array.isArray(this.activeDates) && this.activeDates.some(availDate => availDate.getTime() === date.getTime()));
        const isValueDate = Array.isArray(this.valueDates) && this.valueDates.some(valDate => valDate.getTime() === date.getTime());
        if (isActiveDate || isValueDate) {
            this.currentWorkDate = null;
            this.selectedDate = date;
            this.renderDays();
            this.updateInput();
        }
    }

    updateInput() {
        const formattedDate = this.selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
        const dateBlock = document.getElementById(this.dateBlockId);
        if (dateBlock) {
            dateBlock.textContent = formattedDate;
            const event = new CustomEvent('dateSelected', { detail: { date: this.selectedDate } });
            dateBlock.dispatchEvent(event);
        }
    }

    clearSelection() {
        this.selectedDate = null;
        this.renderDays();
    }
}
