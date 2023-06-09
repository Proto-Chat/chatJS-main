// import .mp3
const newMsg = "https://github.com/ION606/chatJS/raw/main/client/assets/audio/notifications/msg.mp3";
const friendRequest = "https://github.com/ION606/chatJS/raw/main/client/assets/audio/notifications/friend-request.mp3";

function playNotification(notificationType) {
	let notificationSound;

	switch (notificationType) {
		case "msg":
			notificationSound = new Audio(newMsg);
			notificationSound.play();
		break;

		case "friendrequest":
			notificationSound = new Audio(friendRequest);
			notificationSound.play();
		break;

		default: 
	}
}