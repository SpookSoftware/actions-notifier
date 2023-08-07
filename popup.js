document.addEventListener('DOMContentLoaded', function() {
	const notifyButton = document.getElementById('notifyButton');

	notifyButton.addEventListener('click', function() {
			// Query the active tab in the current window
			chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
					const currentTab = tabs[0]; // There will be only one in this array
					const url = currentTab.url; // This is the URL of the current active tab

					chrome.notifications.create({
							iconUrl: 'images/notification-24.png',
							type: 'basic',
							title: 'Current URL',
							message: url
					});
			});
	});
});