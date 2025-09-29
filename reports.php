<?php
  $title = "Звіти";
  $styles = "
    <link rel='stylesheet' href='css/reports.css'>
  ";
  $page = 'REPORTS';

  require "blocks/header.php";

  switch ($current_city):
    // =================================== БЛОК для міста С У М И ===================================
    case 'SUMY': ?>
        <div class="alert">
          <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
          <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
        </div>
        <h1 style="text-align: center;">З В І Т И - С У М И</h1>
        <?php break;
    // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
    case 'CHERNIGIV': ?>
        <script type='module' src='scripts/reports_chernigiv.js'></script>
        <!-- <div class="alert">
          <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span> 
          <strong>УВАГА!</strong> Сторінка знаходиться у розробці.
        </div> -->
        <div id="reports-container" class='main_block'>
            <h3>Завантажити результатів повірки.</h3>
            <div id="upload_message_block" class="message" onclick="clearReportMessageBlock_onClick(this.id)">
                <?php
                    if (isset($_SESSION['upload_message'])) {
                        echo '  <script>
                                    document.addEventListener("DOMContentLoaded", function() {
                                        if (document.getElementById("upload_message_block")) {
                                            createCountdownBlock(document.getElementById("upload_message_block"));
                                        }
                                    });
                                </script>';
                        echo '<div class="message" id="message-block">';
                        $messages = explode('|', htmlspecialchars($_SESSION['upload_message']));
                        foreach ($messages as $message) {
                            if (!empty($message)) {
                                list($type, $text) = explode(':', $message, 2);
                                $text = str_replace('#', '<br>', $text);
                                switch ($type) {
                                    case 'error':
                                        $class = 'alarm_message';
                                        break;
                                    case 'warning':
                                        $class = 'warning_message';
                                        break;
                                    case 'info':
                                        $class = 'info_message';
                                        break;
                                    default:
                                        $class = '';
                                        break;
                                }
                                echo "<div class='message_text $class'><div>" . $text . "</div></div>";
                            }
                        }
                        echo '<hr style="width: 100%;"></div>';              
                        echo '<div id="upload-countdown" class="countdown_clear_message" style="text-align: center; font-size: 12px;">Повідомлення зникнуть через: 10 сек.</div>';
                        echo '<hr style="width: 100%;">'; 
                        unset($_SESSION['upload_message']);
                    }
                ?>
            </div>
            <div class="upload_form">
                <form action="php_server_data/chernigiv_crm_rp_upload.php?token=<?= urlencode($token) ?>" method="post" enctype="multipart/form-data">
                    <span id="file-name">Файл не обрано</span>
                    <label for="fileToUpload" id="file-upload-label" class="report_buttons">О Б Р А Т И</label>
                    <input type="file" name="fileToUpload" id="fileToUpload" style="display:none;" onchange="handleFileInteraction(this)">
                    <input type="submit" value="Завантажити файл" name="submit" id="submit-button" class="report_buttons" style="display:none;">
                </form>
            </div>

            <script>
                function handleFileInteraction(input) {
                    const fileName = input.files[0] ? input.files[0].name : 'Файл не обрано';
                    document.getElementById('file-name').innerText = fileName;
                    document.getElementById('submit-button').style.display = 'inline-block';
                }
            </script>
            <hr style="width: 100%">

            <h3>Звіт для постачальників послуг</h3>
            <div id="report_message_block" class="message" onclick="clearReportMessageBlock_onClick(this.id)"></div>
            <div id="progress-bar">
                <div id="progress-bar-fill">0%</div>
            </div>
            <button id="DownloadReport" class="report_buttons" onclick="showCalendar()">ОБРАТИ ДАТИ</button>
            <div id="balancerContainer" class="balancer-container" style="display:none;">
                <div id="vdk_button_choice" class="button-block inactive" onclick="activate_balancerBlock('vdk_button_choice')">КП "ВДК"</div>
                <div id="otke_button_choice" class="button-block inactive" onclick="activate_balancerBlock('otke_button_choice')">АТ "ОТКЕ"</div>
                <div id="tke_button_choice" class="button-block inactive" onclick="activate_balancerBlock('tke_button_choice')">КП "ТКЕ"</div>
            </div>
            <div id="calendarContainer" class="calendar-container" style="display:none;"></div>
            <input type="text" id="dateRangeInput" readonly style="display:none;" class="report_date_field">
            <button id="GenerateReport" class="report_buttons" style="display:none;" onclick="generateReport()">ЗАВАНТАЖИТИ</button>
            <hr style="width: 100%">
        </div>
        <?php break; 
  endswitch;

  require "blocks/footer.php";
  ?>