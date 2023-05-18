!localStorage.getItem('token') && (window.location.href = 'login.html');

document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;
	const setMask = window.IMask;

	const phone = document.getElementById('phone');
	setMask(phone, { mask: '+{7} (000) 000-00-00' });

	const profileForm = document.getElementById('profileForm');

	async function getProfile() {
		const token = localStorage.getItem('token');
		const url = new URL('https://food-delivery.kreosoft.ru/api/account/profile');
		const header = new Headers();
		header.append('Content-Type', 'application/json');
		header.append('Authorization', `Bearer ${token}`);

		const response = await fetch(url, {
			method: 'GET',
			headers: header,
		});

		if (response.status === 401) throw new Unauthorized('Your session has expired');
		const data = await response.json();
		return data;
	}

	getProfile()
		.then((data) => {
			const { id, fullName, birthDate, gender, address, email, phoneNumber } = data;
			profileForm.elements.name.value = fullName;
			profileForm.elements.dob.value = new Date(birthDate).toISOString().slice(0, 10);
			profileForm.elements.gender.value = gender;
			profileForm.elements.address.value = address;
			profileForm.elements.email.value = email;
			profileForm.elements.phone.value = phoneNumber;
		})
		.catch((error) => {
			if (error instanceof Unauthorized) {
				triggerToast(error.message);
				setTimeout(() => {
					window.location.href = 'login.html';
				}, 1500);
			} else {
				console.error(error);
				triggerToast(error.message);
			}
		});

	profileForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const button = event.submitter;
		const spinner = button.querySelector('span');
		deactivateButton(button, spinner);

		profileForm.classList.add('was-validated');
		profileForm.querySelectorAll('.is-invalid').forEach((element) => {
			element.classList.remove('is-invalid');
		});

		if (!profileForm.checkValidity()) {
			event.stopPropagation();
			setTimeout(() => {
				profileForm.classList.add('was-validated');
				activateButton(button, spinner);
			}, 1500);
			return;
		}

		const profileData = {
			fullName: document.getElementById('name').value,
			birthDate: new Date(document.getElementById('dob').value).toISOString(),
			gender: document.getElementById('gender').value,
			address: document.getElementById('address').value,
			phoneNumber: document.getElementById('phone').value,
		};

		try {
			const token = localStorage.getItem('token');
			const url = new URL('https://food-delivery.kreosoft.ru/api/account/profile');
			const header = new Headers();
			header.append('Content-Type', 'application/json');
			header.append('Authorization', `Bearer ${token}`);

			const response = await fetch(url, {
				method: 'PUT',
				headers: header,
				body: JSON.stringify(profileData),
			});

			if (response.ok) triggerToast('Profile updated successfully');
			else if (response.status === 401) throw new Unauthorized('Your session has expired');
		} catch (error) {
			if (error instanceof Unauthorized) {
				triggerToast(error.message);
				setTimeout(() => {
					window.location.href = 'login.html';
				}, 1500);
			} else {
				console.error(error);
				triggerToast(error.message);
			}
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

class Unauthorized extends Error {
	constructor(message) {
		super(message);
		this.name = 'Unauthorized';
	}
}

function activateButton(button, spinner) {
	button.disabled = false;
	spinner.classList.add('d-none');
}

function deactivateButton(button, spinner) {
	button.disabled = true;
	spinner.classList.remove('d-none');
}
