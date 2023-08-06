window.onload = function() {
	setTimeout(() => {
			chrome.notifications.create({
					iconUrl: "images/notification-24.png",
					type: 'basic',
					title: 'Hello',
					message: 'World!'
			});
	}, 1000);
};
