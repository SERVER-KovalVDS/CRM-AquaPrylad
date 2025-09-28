<!-- ПОЧАТОК картки адреси -->

<?php
switch ($current_city):
    // =================================== БЛОК для міста С У М И ===================================
    case 'SUMY': ?>
        <div class="adrCRDform" id="adrCRDform">
            <div class="adrCRDdiv">
                <div class="adrCRDtitle" id="adrCRDtitle"></div>
                <div>
                    <table>
                        <tr>
                            <td>Колишня:</td>
                            <td><span id="adrCRDold_name"></span></td>
                        </tr>
                        <tr>
                            <td>Район:</td>
                            <td><span id="adrCRDdistrict"></span></td>
                        </tr>
                        <tr>
                            <td>Телефон:</td>
                            <td><span id="adrCRDphone"></span></td>
                        </tr>
                        <tr>
                            <td>Лічильники:</td>
                            <td><span id="adrCRDmeters"></span></td>
                        </tr>
                        <tr>
                            <td>Заявки:</td>
                            <td><span id="adrCRDtasks"></span></td>
                        </tr>
                        <tr>
                            <td>Історія:</td>
                            <td><span>ВІДКРИТИ</span></td>
                        </tr>
                    </table>
                </div>
                <button type="button" class="adrCRD_btn_close" onclick="closeAdrCRDForm()"><span>ЗАКРИТИ</span></button>
            </div>
        </div>
        <?php break;
    // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
    case 'CHERNIGIV': ?>
        <!-- Форма адреси -->
        <div class="CardForm backgroundOverlay" id="adrCRDform">
            <div class="CardFormDiv tab-container" id="adrCRDdiv">
                <div class="CardFormTitle" id="adrCRDtitle"></div>
                <div class="CardFormContent" id="adrCRDContent">
                    <div class="tabs">
                        <button class="tablinks" onclick="openTab(event, 'AddressesGeneralData', 'adrCRDform')">Загальні дані</button>
                        <button class="tablinks" onclick="openTab(event, 'AddressesHistory', 'adrCRDform')">Історія</button>
                    </div>
                    <hr style="width: 100%;">
                    <div class="tabs_blocks">
                        <div id="AddressesGeneralData" class="tabcontent">
                            <table>
                                <tbody id="adrCRDTableBody1"></tbody>
                            </table>
                        </div>
                        <div id="AddressesHistory" class="tabcontent">
                            <table>
                                <tbody id="adrCRDTableBody2"></tbody>
                            </table>
                        </div>  
                    </div>
                    <hr style="width: 100%;">
                </div>
                <div class="adrCRD_btn_close" onclick="closeCardForm('adrCRDform')">ЗАКРИТИ</div>
            </div>
        </div>
        <!-- Форма додавання нової адреси -->
        <div class="AddNewForm backgroundOverlay" id="AddNewADR">
            <div class="add_new_div">
                <div class="add_new_title" id="add_address_title">Н О В А&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;А Д Р Е С А</div>
                <table id="addressFormTable">
                    <tr>
                        <td>
                            <input type="text" id="street" class="required normal-field" placeholder="Вулиця">
                            <div id="street-autocomplete" class="autocomplete-list" style="display: none;"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" oninput="window.formatUpper(this)" class="required normal-field" placeholder="Будинок">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" oninput="window.formatUpper(this)" class="optional normal-field" placeholder="Корпус">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" oninput="window.formatApartment(this)" class="required normal-field" placeholder="Квартира">
                            <div class='newADRnoflat_block'>
                                <input type="checkbox" id="newADRnoflat" name="agreeTerms">
                                <label for="newADRnoflat">Приватний сектор</label>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" class="optional normal-field" placeholder="ФІО споживача">
                        </td>
                    </tr>
                    <tr>
                        <td id="phoneFields">
                            <div class="phone-field-container"></div>
                            <div class="button-container">
                                <div class="add-button" onclick="window.addPhoneField('addNewADR')">
                                    <svg><use href="#plus_icon"></use></svg>
                                </div>
                                <div class="remove-button" style="display: none;" onclick="window.removePhoneField('addNewADR')">
                                    <svg><use href="#minus_icon"></use></svg>
                                </div>
                            </div>
                        </td>
                    </tr>
                </table>
                    <div class="add_new_btn_save" onclick="window.saveNewAddress()">ЗБЕРЕГТИ</div>
                    <div class="add_new_btn_close" onclick="window.closeAddNewForm('ADDRESSES')">ЗАКРИТИ</div>
            </div>
        </div>
        <!-- Форма лічильників -->
        <div class="CardForm backgroundOverlay" id="MetersForm">
            <div class="CardFormDiv tab-container" id="MetersDiv">
                <div class="CardFormTitle" id="MetersTitle"></div>
                <div class="CardFormContent" id="MetersContent">
                    <div class="tabs">
                        <button class="tablinks" onclick="openTab(event, 'MetersGeneralData', 'MetersForm')">Загальні дані</button>
                        <button class="tablinks" onclick="openTab(event, 'MetersDocuments', 'MetersForm')">Документи</button>
                        <button class="tablinks" onclick="openTab(event, 'MetersTasks', 'MetersForm')">Заявки</button>
                        <button class="tablinks" onclick="openTab(event, 'MetersHistory', 'MetersForm')">Історія</button>
                    </div>
                    <hr style="width: 100%;">
                    <div class="tabs_blocks">
                        <div id="MetersGeneralData" class="tabcontent">
                            <table>
                                <tbody id="metersTableBody1"></tbody>
                            </table>
                        </div>
                        <div id="MetersDocuments" class="tabcontent">
                            <table>
                                <tbody id="metersTableBody2"></tbody>
                            </table>
                        </div>
                        <div id="MetersTasks" class="tabcontent">
                            <table>
                                <tbody id="metersTableBody3"></tbody>
                            </table>
                        </div>
                        <div id="MetersHistory" class="tabcontent">
                            <table>
                                <tbody id="metersTableBody4"></tbody>
                            </table>
                        </div>
                    </div>
                    <hr style="width: 100%;">
                </div>
                <div class="Meters_btn_close" onclick="closeCardForm('MetersForm')">ЗАКРИТИ</div>
            </div>
        </div>
        <!-- Форма додавання нового лічильника -->
        <div class="AddNewForm backgroundOverlay" id="AddNewMeter">
            <div class="add_new_div">
                <div class="add_new_title" id="add_meter_title">Н О В И Й&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Л І Ч И Л Ь Н И К</div>
                <table id="meterFormTable">
                    <tr>
                        <td>
                            <input type="text" id="number" class="required normal-field" placeholder="Номер">
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="meter_type_name" class="required normal-field" placeholder="Тип">
                            <div class="autocomplete-list" id="meter_type_name-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="prod_date" class="required normal-field" placeholder="Рік випуску">
                            <div class="autocomplete-list" id="prod_date-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="service_type" class="required normal-field" placeholder="Температура">
                            <div class="autocomplete-list" id="service_type-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="number" step="0.01" id="value" class="optional normal-field" placeholder="Показники">
                            <div class="autocomplete-list" id="value-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="meter_location" class="optional normal-field" placeholder="Місце встановлення">
                            <div class="autocomplete-list" id="meter_location-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="balanser" class="required normal-field" placeholder="Балансоутримувач">
                            <div class="autocomplete-list" id="balanser-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <input type="text" id="meter_address" class="optional normal-field" placeholder="Адреса встановлення">
                            <div class="autocomplete-list" id="meter_address-autocomplete" style="display: none"></div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div class="add_new_btn" id="NewMeteraddNewAddressBtn" onclick="openAddNewForm('ADDRESSES')">
                                <svg><use href="#new_address_icon"></use></svg>
                                <span>НОВА АДРЕСА</span>
                            </div>
                        </td>
                    </tr>
                </table>
                <div class="add_new_btn_save" onclick="window.saveNewMeter()">ЗБЕРЕГТИ</div>
                <div class="add_new_btn_close" onclick="window.closeAddNewForm('METERS')">ЗАКРИТИ</div>
            </div>
        </div>
        <!-- Форма заявок -->
        <div class="CardForm backgroundOverlay" id="TasksForm">
            <div class="CardFormDiv tab-container" id="TasksDiv">
                <div class="CardFormTitle" id="TasksTitle"></div>
                <div class="CardFormContent" id="TasksContent">
                    <div class="tabs" id="TasksTabs">
                        <button class="tablinks" onclick="openTab(event, 'TasksGeneralData', 'TasksForm')">Загальні дані</button>
                        <button class="tablinks" onclick="openTab(event, 'TasksHistory', 'TasksForm')">Історія</button>
                    </div>
                    <hr style="width: 100%;">
                    <div class="tabs_blocks">
                        <div id="TasksGeneralData" class="tabcontent">
                            <table>
                                <tbody id="tasksTableBody1"></tbody>
                            </table>
                        </div>
                        <div id="TasksHistory" class="tabcontent">
                            <table>
                                <tbody id="tasksTableBody2"></tbody>
                            </table>
                        </div>
                    </div>
                    <hr style="width: 100%;">
                </div>
                <?php if ($page === 'ROUTE'): ?>
                    <div class="TasksApplyCancelContainer" id="TasksApplyCancelContainer">
                        <div class="Tasks_btn_apply" id="Tasks_btn_apply" onclick="TasksApplyCancel('apply')">ЗАВЕРШИТИ</div>
                        <div class="Tasks_btn_cancel" id="Tasks_btn_cancel" onclick="TasksApplyCancel('cancel')">ВІДМІНИТИ</div>
                    </div>
                <?php endif; ?>
                <div class="Tasks_btn_close" onclick="closeCardForm('TasksForm')">ЗАКРИТИ</div>
            </div>
        </div>
        <!-- Форма відміни заявки -->
        <div class="CardForm backgroundOverlay" id="TasksApplyCancelForm">
            <div class="CardFormDiv" id="TasksApplyCancelDiv">
                <div class="CardFormTitle" id="TasksApplyCancelTitle">З А В Е Р Ш Е Н Н Я<br>З А Я В К И</div>
                <div class="CardFormContent" id="TasksApplyCancelContent"></div>
            </div>
        </div>
        <!-- Форма додавання нової заявки -->
        <div class="AddNewForm backgroundOverlay" id="AddNewTask">
            <div class="add_new_div tab-container" id="AddNewTaskDiv">
                <div class="add_new_title" id="add_task_title">Н О В А&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;З А Я В К А</div>
                <div id="add_task_content">
                    <div class="tabs" id="TasksTabs">
                        <button class="tablinks" onclick="openTab(event, 'NewTaskRequired', 'AddNewTask')">Обовʼязкові дані</button>
                        <button class="tablinks" onclick="openTab(event, 'NewTaskOptional', 'AddNewTask')">Опційні дані</button>
                    </div>
                    <hr style="width: 100%;">
                    <div class="tabs_blocks">
                        <div id="NewTaskRequired" class="tabcontent">
                        <table id="tasksFormTableRequired">
                            <tr>
                                <td>
                                    <input type="text" id="tasks_address" class="required normal-field" placeholder="Адреса">
                                    <div class="autocomplete-list" id="tasks_address-autocomplete" style="display: none"></div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div class="add_new_btn" id="NewTaskaddNewAddressBtn" onclick="openAddNewForm('ADDRESSES')">
                                        <svg><use href="#new_address_icon"></use></svg>
                                        <span>НОВА АДРЕСА</span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div id="phones-selection" class="phones-selection"></div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <div id="meters-selection" class="meters-selection"></div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <input type="text" id="tasks_type" class="required normal-field" placeholder="Вид робіт">
                                    <div class="autocomplete-list" id="tasks_type-autocomplete" style="display: none"></div>
                                </td>
                            </tr>
                        </table>
                        </div>
                        <div id="NewTaskOptional" class="tabcontent">
                            <table id="tasksFormTableOptional">
                                <tr>
                                    <td>
                                        <input type="text" id="brigade" class="optional normal-field" placeholder="Виконавці">
                                        <div class="autocomplete-list" id="brigade-autocomplete" style="display: none"></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <input type="text" id="cost" class="optional normal-field" placeholder="Вартість">
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <input type="text" id="pay_method" class="optional normal-field" placeholder="Спосіб оплати">
                                        <div class="autocomplete-list" id="pay_method-autocomplete" style="display: none"></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <textarea id="note" class="optional normal-field" placeholder="Примітки"></textarea>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>
                    <hr style="width: 100%;">
                </div>
                <div class="add_new_btn_save" onclick="window.saveNewTask()">ЗБЕРЕГТИ</div>
                <div class="add_new_btn_close" onclick="window.closeAddNewForm('TASKS')">ЗАКРИТИ</div>
            </div>
        </div>
        <?php break;
endswitch; ?>
<!-- КІНЕЦЬ картки адреси -->

<!-- ПОЧАТОК блоку підвалу -->
        <div class="footer_div_before"></div>
        <div class="footer_div">
            <h5 class="footer_text">ТОВ "АКВА ПРИЛАД"<br>Всі права захищені &copy; 2014-2024 р.</h5>
        </div>
<!-- КІНЕЦЬ блоку підвалу -->
<!-- ТОКЕН для заборони роботи без оновлення КЕШу -->
    <?php include "token.php";?>
<!-- ТОКЕН для заборони роботи без оновлення КЕШу -->
    </body>
</html>