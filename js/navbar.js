document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;

	const logoutForm = document.getElementById('logoutForm');

	// navbar item
	const navbar = document.getElementById('navbarSupportedContent');
	const counter = document.querySelector('a[href="cart.html"]');
	const order = document.querySelector('a[href="orders.html"]');
	const profile = document.querySelector('a[href="profile.html"]');

	class Unauthorized extends Error {
		constructor(message) {
			super(message);
			this.name = 'Unauthorized';
		}
	}

	const token = localStorage.getItem('token');
	const carts = JSON.parse(localStorage.getItem('carts'));

	if (!token) {
		[counter, order, profile, logoutForm].forEach((element) => {
			element.remove();
		});

		const loginButton = document.createElement('a');
		loginButton.classList.add('btn', 'btn-deats', 'mx-2');
		loginButton.href = 'login.html';
		loginButton.textContent = 'Login';
		navbar.appendChild(loginButton);

		return;
	}

	counter.setAttribute(
		'data-count',
		carts.reduce((acc, cart) => acc + cart.amount, 0)
	);

	const { email } = parseToken(token);
	profile.innerHTML = email;

	logoutForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const button = event.submitter;
		const spinner = button.querySelector('span');
		deactivateButton(button, spinner);

		try {
			const url = new URL('https://food-delivery.kreosoft.ru/api/account/logout');
			const headers = new Headers();
			headers.append('Content-Type', 'application/json');
			headers.append('Authorization', `Bearer ${token}`);

			const response = await fetch(url, {
				method: 'POST',
				headers,
			});

			if (response.ok) {
				localStorage.removeItem('token');
				localStorage.removeItem('carts');
				window.location.href = 'login.html';
			}

			if (response.status === 401) throw new Unauthorized('Your session has expired');
		} catch (error) {
			if (error instanceof Unauthorized) {
				localStorage.removeItem('token');
				localStorage.removeItem('carts');

				triggerToast(error.message);
				setTimeout(() => {
					activateButton(button, spinner);
					window.location.href = 'login.html';
				}, 1500);
				return;
			} else triggerToast(error.message);
		}

		activateButton(button, spinner);
	});

	function triggerToast(message) {
		const toast = document.getElementById('liveToast');
		const trigger = bootstrap.Toast.getOrCreateInstance(toast);
		toast.querySelector('.toast-body').innerHTML = message;
		trigger.show();
		setTimeout(() => {
			trigger.hide();
		}, 1500);
	}
});

function parseToken(token) {
	var base64Url = token.split('.')[1];
	var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
	var jsonPayload = decodeURIComponent(
		window
			.atob(base64)
			.split('')
			.map(function (c) {
				return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join('')
	);
	return JSON.parse(jsonPayload);
}

function activateButton(button, spinner) {
	button.disabled = false;
	spinner.classList.add('d-none');
}

function deactivateButton(button, spinner) {
	button.disabled = true;
	spinner.classList.remove('d-none');
}
