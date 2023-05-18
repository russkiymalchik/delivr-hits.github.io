localStorage.getItem('token') && (window.location.href = 'menu.html');

document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;
	const setMask = window.IMask;

	const phone = document.getElementById('phone');
	setMask(phone, { mask: '+{7} (000) 000-00-00' });

	const form = document.getElementById('registerForm');
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

		const registerData = {
			fullName: form.elements.name.value,
			password: form.elements.password.value,
			email: form.elements.email.value,
			address: form.elements.address.value,
			birthDate: new Date(form.elements.dob.value).toISOString(),
			gender: form.elements.gender.value,
			phoneNumber: form.elements.phone.value,
		};

		try {
			const url = new URL('https://food-delivery.kreosoft.ru/api/account/register');
			const header = new Headers();
			header.append('Content-Type', 'application/json');

			const response = await fetch(url, {
				method: 'POST',
				headers: header,
				body: JSON.stringify(registerData),
			});

			const data = await response.json();

			if (response.ok) {
				localStorage.setItem('token', data.token);
				localStorage.setItem('carts', []);
				window.location.href = 'menu.html';
			} else {
				if (Object.keys(data).includes('DuplicateUserName')) {
					const email = form.elements.email;
					const message = data.DuplicateUserName.join(' ');

					email.classList.add('is-invalid');
					email.nextElementSibling.innerHTML = message;

					form.classList.add('was-validated');
					activateButton(button, spinner);
					return;
				}

				const { errors, title } = data;

				Object.keys(errors).forEach((key) => {
					let input = null;
					const message = errors[key].join(' ');

					if (key === 'BirthDate') input = form.elements.dob;
					else input = form.elements[key.toLowerCase()];

					input.classList.add('is-invalid');
					input.nextElementSibling.innerHTML = message;

					form.classList.add('was-validated');
					activateButton(button, spinner);
				});

				triggerToast(title);
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
