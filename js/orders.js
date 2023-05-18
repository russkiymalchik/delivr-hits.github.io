!localStorage.getItem('token') && (window.location.href = 'login.html');

document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;
	const orderContainer = document.getElementById('orderContainer');

	fetchSingleOrder()
		.then((order) => {
			refreshOrder(order);
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

	function refreshOrder(order) {
		if (order.length === 0) {
			renderEmptyOrder(orderContainer);
			return;
		}

		renderOrder(order, orderContainer);
		const orders = document.querySelectorAll('#orderCard');

		orders.forEach((order) => {
			const id = order.getAttribute('data-id');
			const confirmForm = order.querySelector('#confirmForm');

			confirmForm &&
				confirmForm.addEventListener('submit', async (event) => {
					event.preventDefault();

					const button = confirmForm.querySelector('button');
					const spinner = button.querySelector('span');
					deactivateButton(button, spinner);

					try {
						const token = localStorage.getItem('token');

						console.log(id);
						const url = new URL(`https://food-delivery.kreosoft.ru/api/order/${id}/status`);
						const headers = new Headers();
						headers.append('Content-Type', 'application/json');
						headers.append('Authorization', `Bearer ${token}`);

						const response = await fetch(url, {
							method: 'POST',
							headers,
						});

						if (response.status === 401) throw new Unauthorized('You are not authorized');

						if (response.ok) {
							localStorage.setItem('carts', JSON.stringify([]));
							triggerToast('Order confirmed');
							activeButton(button, spinner);
							setTimeout(() => {
								window.location.reload();
							}, 1500);
						}
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
						}
					}

					activateButton(button, spinner);
				});
		});
	}

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

async function fetchSingleOrder() {
	const token = localStorage.getItem('token');
	const url = new URL('https://food-delivery.kreosoft.ru/api/order');
	const headers = new Headers();
	headers.append('Content-Type', 'application/json');
	headers.append('Authorization', `Bearer ${token}`);

	const response = await fetch(url, {
		method: 'GET',
		headers,
	});

	if (response.ok) {
		const data = await response.json();
		return data;
	} else if (response.status === 401) throw new Unauthorized('You are not authorized');
}

function formatDate(date) {
	const options = {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
	};

	return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
}

function renderOrder(data, container) {
	container.innerHTML = '';
	data.forEach((order) => {
		const card = document.createElement('a');
		card.classList.add('card', 'mb-4', 'rounded-3', 'overflow-hidden', 'text-decoration-none');

		card.setAttribute('id', 'orderCard');
		card.setAttribute('data-id', order.id);
		card.setAttribute('href', `order-detail.html?id=${order.id}`);

		const { id, deliveryTime, orderTime, status, price } = order;

		card.innerHTML = `
			<div class="col-12">
				<div class="card-body">
					<h6>Order from ${formatDate(orderTime)}</h6>
					<p>
						${status}
						<span>-</span>
						${formatDate(deliveryTime)}
					</p>
				</div>
				<div class="card-footer w-100 bottom-0 bg-white d-flex align-items-center justify-content-between">
					<span>Total price: $${price}</span>
					<form id='confirmForm'>
						<button type='submit' class='btn btn-deats btn-md'>
							<span
								class='spinner-border spinner-border-sm me-2 d-none'
								role='status'
								aria-hidden='true'></span>
							Confirm Order
						</button>
					</form>
				</div>
			</div>
		`;

		if (status !== 'InProcess') card.querySelector('#confirmForm').remove();
		container.appendChild(card);
	});
}

function renderEmptyOrder(container) {
	container.innerHTML = `
	<div class="col-12">
		<div class="d-flex py-5 justify-content-center align-items-center text-center">
			<h6>You have no orders yet</h6>
		</div>
	</div>
	`;
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
