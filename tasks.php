<?php
  $title = "Архів заявок";
  $styles = "
    
  ";
  $page = 'TASKS';
  $nav_search = true;
  $nav_filter = true;

require "blocks/header.php";

switch ($current_city):
    // =================================== БЛОК для міста С У М И ===================================
    case 'SUMY': ?>
        <script type='module' src='scripts/tasks.js'></script>
        <div class="alert">
            <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
            <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
        </div>
        <?php break;
    // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
    case 'CHERNIGIV': ?>
        <script type='module' src='scripts/tasks_chernigiv.js'></script>
        <!-- ПОЧАТОК головної панелі -->
        <!-- Форма пошуку --> 
        <div class="SearchForm backgroundOverlay" id="SearchForm">
            <div class="search_div tab-container" id="SearchDiv">
                <div class="search_div_discr">П О Ш У К</div>
                <div class="search_btn_close" onclick="closeSearchForm()">ЗАКРИТИ</div>
                <hr style="width: 100%;">
                <div class="tabs">
                    <button class="tablinks" onclick="openTab(event, 'AddressTab', 'SearchForm');" id="defaultOpenSearch">За адресою</button>
                    <button class="tablinks" onclick="openTab(event, 'MeterTab', 'SearchForm');">За лічильником</button>
                </div>
                <div class="tabs_blocks">
                    <div id="AddressTab" class="tabcontent">
                        <input type="text" class="search_block" placeholder="Введіть хоча б 3 літери адреси..." id="SearchValueAddress" onkeyup="SearchFunctionAddress()">
                        <div id="SearchBlockAddress" class="result_div"></div>
                        <p style='display: none' class='result_val_no' id='no_adr_address'>Заявки з такою адресою не знайдено!!!</p>
                    </div>
                    <div id="MeterTab" class="tabcontent">
                        <input type="text" class="search_block" placeholder="Введіть хоча б 2 цифри номеру лічильника..." id="SearchValueMeter" onkeyup="SearchFunctionMeter()">
                        <div id="SearchBlockMeter" class="result_div"></div>
                        <p style='display: none' class='result_val_no' id='no_adr_meter'>Заявки з таким номером лічильника не знайдено!!!</p>
                    </div>  
                </div>
                <hr style="width: 100%;">
            </div>
        </div>
        <!-- Форма фільтру --> 
        <div class="FilterForm backgroundOverlay" id="FilterForm">
            <div class="filter_div" id="FilterDiv">
                <div class="filter_div_discr">Ф І Л Ь Т Р</div>
                <div class="filter_btn_close" onclick="closeFilterForm('TASKS')">ЗАКРИТИ</div>
                <div id="FilterBlock">
                    <div id="filterForm">
                    <hr style="width: 100%;">
                        <div class="autocomplete">
                            <input type="text" id="dateInput" placeholder="Дата заявки" readonly>
                            <div id="dateCalendar" class="calendar-container" style="display: none;"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="work_dateInput" placeholder="Дата виконання" readonly>
                            <div id="work_dateCalendar" class="calendar-container" style="display: none;"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="tasks_typeInput" placeholder="Вид робіт">
                            <div id="tasks_typeList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="brigadeInput" placeholder="Виконавці">
                            <div id="brigadeList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="pay_methodInput" placeholder="Спосіб оплати">
                            <div id="pay_methodList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="statusInput" placeholder="Статус">
                            <div id="statusList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="addressInput" placeholder="Адреса">
                            <div id="addressList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <hr style="width: 100%;">
                        <div class="filter_btn" onclick="applyFilter()">Фільтрувати</div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Інформаційні форми --> 
        <div class="alert">
            <div id="alertMessage" class="message"></div>
            <div class="closebtn" onclick="stopAndClose(this)">&times;</div>
        </div>
        <div class="warning">
            <div id="warningMessage" class="message"></div>
            <div class="closebtn" onclick="stopAndClose(this)">&times;</div>
        </div>
        <div class="info" style="display:none;">
            <div id="infoMessage" class="message"></div>
            <div class="closebtn" onclick="stopAndClose(this)">&times;</div>
        </div>
        <div id='tasks-container' class='page_row'></div>
        <?php break; 
endswitch;

require "blocks/footer.php";