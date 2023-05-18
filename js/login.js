localStorage.getItem('token') && (window.location.href = 'menu.html');

document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;

	const form = document.getElementById('loginForm');
	form.addEventListener('submit', async (event) => {
		event.preventDefault();

		const button = form.querySelector('button');
		const spinner = button.querySelector('span');
		deactivateButton(button, spinner);

		form.classList.remove('was-validated');
		form.querySelectorAll('.is-invalid').forEach((element) => {
			element.classList.remove('is-invalid');
		});

		if (!form.checkValidity()) {
			event.stopPropagation();
			setTimeout(() => {
				form.classList.add('was-validated');
				activateButton(button, spinner);
			}, 1500);
			return;
		}

		const loginData = {
			email: form.elements.email.value,
			password: form.elements.password.value,
		};

		try {
			const url = new URL('https://food-delivery.kreosoft.ru/api/account/login');
			const header = new Headers();
			header.append('Content-Type', 'application/json');

			const response = await fetch(url, {
				method: 'POST',
				headers: header,
				body: JSON.stringify(loginData),
			});

			const data = await response.json();

			if (response.ok) {
				const url = new URL('https://food-delivery.kreosoft.ru/api/basket');
				const headers = new Headers();
				headers.append('Content-Type', 'application/json');
				headers.append('Authorization', `Bearer ${data.token}`);

				const response = await fetch(url, {
					method: 'GET',
					headers,
				});

				const carts = await response.json();
				localStorage.setItem('token', data.token);
				localStorage.setItem('carts', JSON.stringify(carts));
				window.location.href = 'menu.html';
			} else {
				const email = form.elements.email;
				const password = form.elements.password;

				email.classList.add('is-invalid');
				password.classList.add('is-invalid');

				email.nextElementSibling.innerHTML = data.errors.email;
				password.nextElementSibling.innerHTML = data.errors.password;

				form.classList.add('was-validated');
				activateButton(button, spinner);
			}
		} catch (error) {
			console.error(error);
			triggerToast(error.message);
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

function activateButton(button, spinner) {
	button.disabled = false;
	spinner.classList.add('d-none');
}

function deactivateButton(button, spinner) {
	button.disabled = true;
	spinner.classList.remove('d-none');
}
