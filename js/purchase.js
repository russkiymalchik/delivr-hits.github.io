!localStorage.getItem('token') && (window.location.href = 'login.html');

document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;

	const cartContainer = document.getElementById('cartContainer');
	const orderForm = document.getElementById('orderForm');

	// function to get current time string with localisation ISO format 0, 16
	// function getCurrentTimeString() {
	// 	const date = new Date();
	// 	const offset = date.getTimezoneOffset() * 60000;
	// 	const localISOTime = new Date(date - offset).toISOString().slice(0, 16);
	// 	return localISOTime;
	// }

	function getCurrentTime(offset = 0) {
		const date = new Date();
		const timeOffset = date.getTimezoneOffset() * 60000;
		const localISOTime = new Date(date - timeOffset + offset).toISOString().slice(0, 16);
		return localISOTime;
	}

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

	const carts = JSON.parse(localStorage.getItem('carts'));

	if (carts.length === 0) {
		renderEmptyCart(cartContainer);
		triggerToast('Your cart is empty');
		setTimeout(() => {
			window.location.href = 'orders.html';
		}, 1500);
		return;
	}

	renderCart(carts, cartContainer);

	getProfile()
		.then((data) => {
			const { id, fullName, birthDate, gender, address, email, phoneNumber } = data;

			orderForm.querySelector('#email').value = email;
			orderForm.querySelector('#phone').value = phoneNumber;
			orderForm.querySelector('#address').value = address;
			orderForm.querySelector('#delivery').value = getCurrentTime(60 * 60 * 1000);

			const total = carts.reduce((acc, cart) => acc + cart.totalPrice, 0);
			orderForm.querySelector('#total').innerHTML = `$${total}`;

			orderForm.addEventListener('submit', async (event) => {
				event.preventDefault();

				const button = event.submitter;
				const spinner = button.querySelector('span');
				deactivateButton(button, spinner);

				orderForm.classList.add('was-validated');
				orderForm.querySelectorAll('.is-invalid').forEach((element) => {
					element.classList.remove('is-invalid');
				});

				if (!orderForm.checkValidity()) {
					event.stopPropagation();
					setTimeout(() => {
						orderForm.classList.add('was-validated');
						activateButton(button, spinner);
					}, 1500);
					return;
				}

				const { address, delivery } = orderForm.elements;
				const order = {
					deliveryTime: new Date(delivery.value).toISOString(),
					address: address.value,
				};

				try {
					const token = localStorage.getItem('token');

					const url = new URL('https://food-delivery.kreosoft.ru/api/order');
					const header = new Headers();
					header.append('Content-Type', 'application/json');
					header.append('Authorization', `Bearer ${token}`);

					const response = await fetch(url, {
						method: 'POST',
						headers: header,
						body: JSON.stringify(order),
					});

					if (response.status === 401) throw new Unauthorized('Your session has expired');

					if (response.ok) {
						localStorage.setItem('carts', JSON.stringify([]));
						triggerToast('Your order has been placed');
						setTimeout(() => {
							window.location.href = 'orders.html';
						}, 1500);
						return;
					}

					const data = await response.json();

					const delivrey = orderForm.querySelector('#delivery');
					delivrey.classList.add('is-invalid');
					delivrey.nextElementSibling.innerHTML = data.message;
					orderForm.classList.remove('was-validated');

					console.error(data);
				} catch (error) {
					if (error instanceof Unauthorized) {
						localStorage.removeItem('token');
						localStorage.removeItem('carts');

						triggerToast(error.message);
						setTimeout(() => {
							window.location.href = 'menu.html';
						}, 1500);
					} else {
						console.error(error);
						triggerToast(error.message);
						setTimeout(() => {
							window.location.reload();
						}, 1500);
					}
				}

				activateButton(button, spinner);
			});
		})
		.catch((error) => {
			if (error instanceof Unauthorized) {
				localStorage.removeItem('token');
				localStorage.removeItem('carts');

				triggerToast(error.message);
				setTimeout(() => {
					window.location.href = 'menu.html';
				}, 1500);
			} else {
				console.error(error);
				triggerToast(error.message);
				setTimeout(() => {
					window.location.reload();
				}, 1500);
			}
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

function renderEmptyCart(container) {
	container.innerHTML = `
	<div class="col-12">
		<div class="d-flex py-5 justify-content-center align-items-center text-center">
			<h6>Your cart is empty</h6>
		</div>
	</div>`;
}

function renderCart(carts, container) {
	container.innerHTML = '';
	carts.forEach((cart) => {
		const { name, price, totalPrice, amount, image, id } = cart;

		const card = document.createElement('div');
		card.classList.add('card', 'mb-4', 'rounded-3', 'overflow-hidden');
		card.setAttribute('id', 'cartCard');
		card.setAttribute('data-id', id);

		card.innerHTML = `
		<div class="row g-0">
			<a href="food.html?id=${id}" class="card-img-container horizontal col-12 col-xl-4">
				<img
					src="${image}"
					class="card-img-top object-fit-cover h-100"
					alt="food image" />
			</a>
			<div class="col-12 col-xl-8 position-relative">
				<div class="card-body mb-5">
					<h6>${name}</h6>
					<p id="cartPrice">$${price}</p>
				</div>
				<div
					class="card-footer w-100 position-absolute bottom-0 bg-white d-flex align-items-center justify-content-between">
					<span id="cartTotal">Total Price $${totalPrice}</span>
					<div class="d-flex align-items-center justify-content-end">
						<span class="mx-3" id="cartAmount">
							${amount} item
						</span>
					</div>
				</div>
			</div>
		</div>
		`;
		container.appendChild(card);
	});
}

function activateButton(button, spinner) {
	button.disabled = false;
	spinner.classList.add('d-none');
}

function deactivateButton(button, spinner) {
	button.disabled = true;
	spinner.classList.remove('d-none');
}

class Unauthorized extends Error {
	constructor(message) {
		super(message);
		this.name = 'Unauthorized';
	}
}
