<?php
  $title = "Адреси";
  $styles = "
    
  ";
  $page = 'ADDRESSES';
  $nav_search = true;
  $nav_filter = true;
  $nav_add_new = true;

require "blocks/header.php";

switch ($current_city):
    // =================================== БЛОК для міста С У М И ===================================
        case 'SUMY': ?>
            <script type='module' src='scripts/adresses.js'></script>
            <!-- ПОЧАТОК головної панелі -->
            <!-- Форма пошуку --> 
            <div class="SearchForm" id="SearchForm">
                <div class="search_div">
                <div class="search_div_discr">П О Ш У К</div>
                <button type="button" class="search_btn_close" onclick="closeSearchForm()"><span>ЗАКРИТИ</span></button>
                <input type="text" class="search_block" placeholder="Введіть хоча б 2 літери назви..." id="SearchValue" onkeyup="SearchFunction()">
                <div id="SearchBlock" class="result_div"></div>
                <p style='display: none' class='result_val_no' id='no_adr'>Такої адреси не знайдено!!!</p>
                </div>
            </div>

            <!-- Форма фільтру --> 
            <div class="FilterForm" id="FilterForm">
                <div class="filter_div">
                    <div class="filter_div_discr">Ф І Л Ь Т Р</div>
                    <button type="button" class="filter_btn_close" onclick="closeFilterForm()"><span>ЗАКРИТИ</span></button>
                    <div id="FilterBlock">
                        <form id="filterForm">
                            <div class="autocomplete">
                                <input type="text" id="newNameInput" placeholder="Назва вулиці">
                                <div id="newNameList" class="autocomplete-items"></div>
                            </div>
                            <div class="autocomplete">
                                <input type="text" id="buildingNumberInput" placeholder="Номер будівлі">
                                <div id="buildingNumberList" class="autocomplete-items"></div>
                            </div>
                            <div class="autocomplete">
                                <input type="text" id="buildingUnitInput" placeholder="Номер корпусу">
                                <div id="buildingUnitList" class="autocomplete-items"></div>
                            </div>
                            <div class="autocomplete">
                                <input type="text" id="flatOfficeNumberInput" placeholder="Номер кв./офісу">
                                <div id="flatOfficeNumberList" class="autocomplete-items"></div>
                            </div>
                            <div class="autocomplete">
                                <input type="text" id="districtInput" placeholder="Район">
                                <div id="districtList" class="autocomplete-items"></div>
                            </div>
                            <button type="button" class="filter_btn" onclick="applyFilter()"><span>Фільтрувати</span></button>
                        </form>
                    </div>
                </div>
            </div>
            <div id="autocompletePopup" class="autocomplete-popup" style="display: none;"></div>

            <!-- Форма додавання нової адреси -->
            <div class="AddNewForm" id="AddNewForm">
                <div class="add_new_div">
                    <div class="add_new_title" id="add_new_title">Н О В А&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;А Д Р Е С А</div>
                    <table id="addressFormTable">
                        <tr>
                            <td>
                                <div class="autocomplete-container">
                                    <input type="text" id="streetInput" placeholder="Вулиця">
                                    
                                </div>
                                <div id="streetAutocompletePopup" class="autocomplete-popup" style="display: none;"></div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <input type="text" placeholder="Будинок" oninput="window.formatUpper(this)">
                                <label>
                                    <input type="checkbox" id="toggleCorpus" onclick="window.toggleCorpusField()"> Корпус
                                </label>
                            </td>
                        </tr>
                        <tr id="corpusRow" style="display: none;">
                            <td><input type="text" placeholder="Корпус" oninput="window.formatUpper(this)"></td>
                        </tr>
                        <tr>
                            <td><input type="text" placeholder="Квартира" oninput="window.formatApartment(this)"></td>
                        </tr>
                        <tr>
                            <td id="phoneFields">
                            <div class="phoneField">
                                <select>
                                    <option value="050">050</option>
                                    <option value="066">066</option>
                                    <option value="099">099</option>
                                    <option value="067">067</option>
                                    <option value="097">097</option>
                                    <option value="093">093</option>
                                    <option value="073">073</option>
                                    <option value="0542">0542</option>
                                </select>
                                <input type="text" placeholder="ххх-хх-хх" oninput="window.formatPhoneNumber(this)">
                            </div>
                            <button type="button" onclick="window.addPhoneField()">+</button>
                            <button type="button" id="removePhoneButton" style="display: none;" onclick="window.removePhoneField()">-</button>
                            </td>
                        </tr>
                    </table>
                        <button type="button" class="add_new_btn_save" onclick="window.saveNewAddress()"><span>ЗБЕРЕГТИ</span></button>
                        <button type="button" class="add_new_btn_close" onclick="window.closeAddNewForm('ADDRESSES')"><span>ЗАКРИТИ</span></button>
                </div>
            </div>

            <!-- Форма виводу попередження --> 
            <div class="alert">
                <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
                <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
            </div>
            
            <div id='adresses-container' class='page_row'></div>

            <?php break;
    // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
    case 'CHERNIGIV': ?>
        <script type='module' src='scripts/addresses_chernigiv.js'></script>
        <!-- ПОЧАТОК головної панелі -->
        <!-- Форма пошуку --> 
        <div class="SearchForm backgroundOverlay" id="SearchForm">
            <div class="search_div">
            <div class="search_div_discr">П О Ш У К</div>
            <div class="search_btn_close" onclick="closeSearchForm()">ЗАКРИТИ</div>
            <input type="text" class="search_block" placeholder="Введіть хоча б 3 літери адреси..." id="SearchValue" onkeyup="SearchFunction()">
            <div id="SearchBlock" class="result_div"></div>
            <p style='display: none' class='result_val_no' id='no_adr'>Такої адреси не знайдено!!!</p>
            </div>
        </div>
        <!-- Форма фільтру --> 
        <div class="FilterForm backgroundOverlay" id="FilterForm">
            <div class="filter_div">
                <div class="filter_div_discr">Ф І Л Ь Т Р</div>
                <div class="filter_btn_close" onclick="closeFilterForm('ADDRESSES')">ЗАКРИТИ</div>
                <div id="FilterBlock">
                    <form id="filterForm">
                        <div class="autocomplete">
                            <input type="text" id="streetInput" placeholder="Назва вулиці">
                            <div id="streetList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="adr_buildingInput" placeholder="Номер будівлі">
                            <div id="adr_buildingList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="adr_building2Input" placeholder="Номер корпусу">
                            <div id="adr_building2List" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="autocomplete">
                            <input type="text" id="adr_fl_ofInput" placeholder="Номер кв./офісу">
                            <div id="adr_fl_ofList" class="autocomplete-list" style="display: none"></div>
                        </div>
                        <div class="filter_btn" onclick="applyFilter()">Фільтрувати</div>
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
        <div id='addresses-container' class='page_row'></div>

        <?php break; 
endswitch;

require "blocks/footer.php";
?>
