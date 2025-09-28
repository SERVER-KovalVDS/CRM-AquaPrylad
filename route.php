<?php
    $title = "Маршрути";
    $styles = " 
                <link rel='stylesheet' href='css/route.scss'>
    ";
    $page = 'ROUTE';
    $nav_filter = true;
    $nav_add_new = true;
    $nav_print = true;
    $nav_excel = true;
    
    require "blocks/header.php";

    switch ($current_city):
        // =================================== БЛОК для міста С У М И ===================================
        case 'SUMY': ?>
            <div class="alert">
              <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
              <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
            </div>
            <h1 style="text-align: center;">М А Р Ш Р У Т И - С У М И</h1>
            <?php break;
        // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
        case 'CHERNIGIV': ?>
            <script type='module' src='scripts/route_chernigiv.js'></script>
            <!-- ПОЧАТОК головної панелі -->

            <!-- Форма фільтру --> 
            <div class="FilterForm backgroundOverlay" id="FilterForm">
                <div class="filter_div" id="FilterDiv">
                    <div class="filter_div_discr" id="RouteFilterDivDiscr">Ф І Л Ь Т Р</div>
                    <div class="filter_btn_close" onclick="closeFilterForm('ROUTE')">ЗАКРИТИ</div>
                    <div id="FilterBlock">
                        <div id="filterForm">
                        <hr style="width: 100%;">
                            <div id="RouteFilterContainer"></div>
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
            <div id='route-container' class="route-container">
                <div id='route-top-bar' class="route-top-bar"></div>
                <div id='route-personal-content' class="route-content route-personal page_row"></div>
                <div id='route-common-content' class="route-content route-common page_row"></div>
                <div id='route-date-bar' class="route-content route-date-bar page_row">
                    <div id='no-worker-selected' class="no-worker-selected">
                          <p>Для редагування маршрутів</p>
                          <p>оберіть виконавця</p>
                    </div>
                </div>
            </div>
            <div id='no-small-screen' class="no-small-screen">
                <p>У В А Г А ! ! !</p>
                <p>Для роботи з маршрутами</p>
                <p>необхідно щоб ширина сторінка</p>
                <p>була не менше 1200 пікселів</p>
            </div>
            <?php break; 
    endswitch;
    
    require "blocks/footer.php";
?>