<?php
  $title = "Налаштування";
  $styles = " <link rel='stylesheet' href='css/settings.scss'>
              <link href='https://fonts.googleapis.com/css2?family=Black+Ops+One&display=swap' rel='stylesheet'>
              <script type='module' src='scripts/settings_common.js'></script>
";
  $page = 'SETTINGS';
  
  require "blocks/header.php";
  // =================================== ЗАГАЛЬНИЙ БЛОК ===================================
?>
    <div class="main_block">
        <div id="connected_users-block" class="main_block-child">
            <h1>CONNECTED USERS</h1>
            <div id="connected_users-container" class="connected_users-container"></div>
        </div>
        <div id="connected_users-block" class="main_block-child">
            <h1>BLOCKED IPs</h1>
            <div id='blocked_ip-container' class="blocked_ip-container"></div>
        </div>
    </div>
<?php
  switch ($current_city):
      // =================================== БЛОК для міста С У М И ===================================
      case 'SUMY': ?>

          <?php break;
      // =================================== БЛОК для міста Ч Е Р Н І Г І В ===================================
      case 'CHERNIGIV': ?>
        
        <?php break; 
  endswitch;
  
  require "blocks/footer.php";
?>