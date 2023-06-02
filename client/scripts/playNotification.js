// import .mp3
const defaultNotification = require('../assets/audio/notifications/default.mp3')

function playNotification(notificationType) {

  let notificationSound;

  switch(notificationType){
    // case 'A':
    //   notificationSound = new Audio();
    //   notificationSound.play();
    //   break;
    // case 'B':
    //   notificationSound = new Audio();
    //   notificationSound.play();
    //   break;
    default: 
      notificationSound = new Audio(defaultNotification);
      notificationSound.play();
  }

}