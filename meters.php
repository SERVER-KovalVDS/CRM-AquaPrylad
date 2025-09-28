<?php
  $title = "Лічильники";
  $styles = "
    
  ";
  $page = 'METERS';
  $nav_search = true;
  $nav_filter = true;
  $nav_add_new = true;

  require "blocks/header.php";
  switch ($current_city):
    // =================================== БЛОК для міста С У М И ===================================
    case 'SUMY': ?>
        <script type='module' src='scripts/meters.js'></script>
        <!-- ПОЧАТОК головної панелі -->
        <div class="alert">
          <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
          <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
        </div>
        <div id="meters-container" class='meters-row'></div>
        <?php break;
    // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
    case 'CHERNIGIV': ?>
        <script type='module' src='scripts/meters_chernigiv.js'></script>
        <!-- Форма пошуку --> 
        <div class="SearchForm backgroundOverlay" id="SearchForm">
            <div class="search_div">
            <div class="search_div_discr">П О Ш У К</div>
            <div class="search_btn_close" onclick="closeSearchForm()">ЗАКРИТИ</div>
            <input type="text" class="search_block" placeholder="Введіть хоча б 2 цифри номеру лічильника..." id="SearchValue" onkeyup="SearchFunction()">
            <div id="SearchBlock" class="result_div"></div>
            <p style='display: none' class='result_val_no' id='no_meters'>Лічильника з таким номером <br> не знайдено!!!</p>
            </div>
        </div>
        <!-- Форма фильтру лічильників --> 
        <div class="FilterForm backgroundOverlay" id="FilterForm">
            <div class="filter_div">
                <div class="filter_div_discr">Ф І Л Ь Т Р</div>
                <div class="filter_btn_close" onclick="closeFilterForm('METERS')">ЗАКРИТИ</div>
                <div id="FilterBlock">
                    <form id="filterForm">
                        <div class="autocomplete">
                            <input type="text" id="numberInput" placeholder="Номер">
                            <div id="numberList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="typeInput" placeholder="Тип">
                            <div id="typeList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="prod_dateInput" placeholder="Дата виробництва">
                            <div id="prod_dateList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="service_typeInput" placeholder="Температура">
                            <div id="service_typeList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="certificate_dateInput" placeholder="Дата документу" readonly>
                            <div id="certificate_dateCalendar" class="calendar-container" style="display: none;"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="verification_dateInput" placeholder="Дата КЕП" readonly>
                            <div id="verification_dateCalendar" class="calendar-container" style="display: none;"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="validity_dateInput" placeholder="Дійсний ДО" readonly>
                            <div id="validity_dateCalendar" class="calendar-container" style="display: none;"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="locationInput" placeholder="Розташування">
                            <div id="locationList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="balanserInput" placeholder="Балансоутримач">
                            <div id="balanserList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="resultInput" placeholder="Повірка">
                            <div id="resultList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="statusInput" placeholder="Статус">
                            <div id="statusList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="addressInput" placeholder="Адреса">
                            <div id="addressList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="filter_btn" onclick="applyFilter()">Фільтрувати</div>
                        <hr style="width: 100%;">
                        <div class="filter_btn" onclick="showNoAddressMeters()">Лічильники<br>без адрес</div>
                        <?php if ($_SESSION['role'] === 'admin' || $_SESSION['role'] === 'director'): ?>
                            <hr style="width: 100%;">
                            <div class="filter_btn" onclick="showDublicateMeters()">ДУБЛІКАТИ</div>
                        <?php endif; ?>
                    </form>
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
        <div id="meters-container" class='page_row'></div>
        <?php break; 
  endswitch;
  require "blocks/footer.php";
?>