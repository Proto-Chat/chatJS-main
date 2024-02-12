/**
 * @param {{status: String, icon: String, username: String, uid: String, reasonforban: String}} user
 */
const createBannedUserCard = (user) => {
	const userDiv = document.createElement('div');
	userDiv.className = 'user-item';

	// IMAGE DOES NOT WORK AT THE MOMENT
	const userIcon = document.createElement('img');
	userIcon.src = user.icon;
	userIcon.className = 'user-icon';
	userDiv.appendChild(userIcon);

	const userName = document.createElement('span');
	userName.textContent = `${user.username}\tReason: ${user.reasonforban}`;
	userDiv.appendChild(userName);

	const unbanButton = document.createElement('button');
	unbanButton.textContent = 'Unban';
	unbanButton.className = 'unban-button';
	unbanButton.onclick = function() {
		// Implement unban logic here
		console.log('Unban User:', user.uid);
	};
	userDiv.appendChild(unbanButton);

	return userDiv;
}


async function displayBanned(data) {
	// close the settings modal
	document.querySelector('.close').click();

	//#region CREATE THE MODAL
	const modal = document.createElement("div");
    modal.setAttribute("id", "bannedUsersModal");
    modal.setAttribute("class", "modal");

    // Create modal content container
    const modalContent = document.createElement("div");
    modalContent.setAttribute("class", "modal-content");

    // Close button
    const closeButton = document.createElement("span");
    closeButton.setAttribute("class", "close");
    closeButton.innerHTML = "&times;";
    closeButton.onclick = () => (document.getElementById('bannedUsersModal').remove());

    // Modal title
    const title = document.createElement("h2");
    title.textContent = "Banned Users";

    // User list container
    const listContainer = document.createElement("div");
    listContainer.setAttribute("id", "bannedUsersList");

    // Append elements to modal content
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(listContainer);

    modal.appendChild(modalContent);
	//#endregion

	for (const user of data.banned) listContainer.appendChild(createBannedUserCard(user));

	document.getElementById('maincontent').appendChild(modal);
}


async function handleActionCode(data) {
	console.log(data);

	switch (data.actioncode) {
		case 3: displayBanned({banned: [
			{
				"status": "ehe >:3",
				"icon": "",
				"username": "ION606",
				"uid": "5aa9b536-e0fb-4d61-9145-07f192ca2cf3",
			  	"reasonforban": "too gay"
			  }
		]});
		break;
	}
}