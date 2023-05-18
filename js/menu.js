document.addEventListener('DOMContentLoaded', function () {
	const bootstrap = window.bootstrap;

	const filterForm = document.getElementById('filterForm');
	const foodContainer = document.getElementById('foodContainer');
	const counter = document.querySelector('a[href="cart.html"]');

	function refreshFood(data) {
		setFilterValue(filterForm);

		if (data.hasOwnProperty('status') && data.status === 'Error') {
			renderEmptyCard(foodContainer);
			return;
		}

		const { dishes, pagination } = data;
		if (!dishes.length) {
			renderEmptyCard(foodContainer);
			return;
		}

		renderCard(dishes, foodContainer);

		const carts = JSON.parse(localStorage.getItem('carts')) || [];
		const foodCard = foodContainer.querySelectorAll('#foodCard');

		function handleMultiButton(event, button, cart, count, id) {
			event.preventDefault();

			const method = button.getAttribute('data-method');

			if (method == 'increase') {
				cart.amount++;
				cart.totalPrice = cart.price * cart.amount;
			}
			if (method == 'decrease') {
				cart.amount--;
				cart.totalPrice = cart.price * cart.amount;
			}

			updateFood(id, method)
				.then((data) => {
					count.textContent = cart.amount;
					counter.setAttribute(
						'data-count',
						carts.reduce((acc, cart) => acc + cart.amount, 0)
					);
					localStorage.setItem('carts', JSON.stringify(carts.filter((cart) => cart.amount > 0)));
					refreshFood({ dishes, pagination });
					triggerToast(data.message);
				})
				.catch((error) => {
					if (error instanceof Unauthorized) {
						localStorage.removeItem('token');
						localStorage.removeItem('carts');

						triggerToast(error.message);
						setTimeout(() => {
							window.location.href = 'login.html';
						}, 1500);
					} else {
						console.error(error.message);
						triggerToast(error.message);
					}
				});
		}

		function handleSingleButton(event, button, spinner, dish) {
			event.preventDefault();
			deactivateButton(button, spinner);

			carts.push({
				amount: 1,
				id: dish.id,
				name: dish.name,
				price: dish.price,
				image: dish.image,
				totalPrice: dish.price,
			});

			updateFood(dish.id, 'increase')
				.then((data) => {
					counter.setAttribute(
						'data-count',
						carts.reduce((acc, item) => acc + item.amount, 0)
					);
					localStorage.setItem('carts', JSON.stringify(carts));
					refreshFood({ dishes, pagination });
					triggerToast(data.message);
				})
				.catch((error) => {
					if (error instanceof Unauthorized) {
						localStorage.removeItem('token');
						localStorage.removeItem('carts');

						triggerToast(error.message);
						setTimeout(() => {
							window.location.href = 'login.html';
						}, 1500);
					} else {
						console.error(error.message);
						setTimeout(() => {
							activateButton(button, spinner);
							triggerToast(error.message);
						}, 500);
					}
				});
		}

		foodCard.forEach((card) => {
			const id = card.getAttribute('data-id');
			const dish = dishes.find((dish) => dish.id == id);
			const cart = carts.find((item) => item.id === id);

			if (!cart) {
				const button = card.querySelector('button');
				const spinner = button.querySelector('span');

				button.addEventListener('click', (event) => {
					handleSingleButton(event, button, spinner, dish);
				});
			} else {
				const count = card.querySelector('#amount');
				const buttons = card.querySelectorAll('button');

				buttons.forEach((button) => {
					button.addEventListener('click', (event) => {
						handleMultiButton(event, button, cart, count, id);
					});
				});
			}
		});
	}

	fetchFood()
		.then((data) => {
			refreshFood(data);
			renderPagination(data.pagination);
		})
		.catch((error) => {
			console.error(error);
			triggerToast(error.message);
		});

	filterForm.addEventListener('submit', async (event) => {
		event.preventDefault();

		const button = event.submitter;
		const spinner = button.querySelector('span');
		deactivateButton(button, spinner);

		const url = new URL(window.location.origin + window.location.pathname);
		const param = new URLSearchParams();

		const vegetarian = filterForm.querySelector('#vegetarian').checked;
		const categories = $('#categories').selectpicker().val();
		const sorting = $('#sorting').selectpicker().val();

		sorting !== '' && param.set('sorting', sorting);
		vegetarian && param.set('vegetarian', vegetarian);
		categories && categories.forEach((category) => param.append('categories', category));
		url.search = param;

		setTimeout(() => {
			window.history.pushState({}, '', url);

			fetchFood()
				.then((data) => {
					refreshFood(data);
					renderPagination(data.pagination);
				})
				.catch((error) => {
					console.error(error);
					triggerToast(error.message);
				});

			activateButton(button, spinner);
		}, 500);
	});

	function renderPagination(pagination) {
		const { _, count, current } = pagination;

		$('#pagination').Pagination(
			{
				size: count,
				pageShow: count,
				page: current,
			},
			({ page }) => {
				const url = new URL(window.location.origin + window.location.pathname);
				const param = new URLSearchParams(window.location.search);

				param.set('page', page);
				url.search = param;
				window.history.pushState({}, '', url);

				console.log(page);

				fetchFood()
					.then((data) => {
						refreshFood(data);
						$('#pagination li').removeClass('active');
						$(`#pagination li a[data-index=${page}]`).parent().addClass('active');
						$('html, body').animate({
							scrollTop: $('#pagination').offset().top,
						});
					})
					.catch((error) => {
						console.error(error);
						triggerToast(error.message);
					});
			}
		);
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

class Unauthorized extends Error {
	constructor(message) {
		super(message);
		this.name = 'Unauthorized';
	}
}

async function fetchFood() {
	const url = new URL('https://food-delivery.kreosoft.ru/api/dish');
	const param = new URLSearchParams(window.location.search);
	url.search = param;

	const response = await fetch(url);
	const data = await response.json();
	return data;
}

async function updateFood(id, method) {
	const token = localStorage.getItem('token');
	if (!token) throw new Error('Please login to continue');

	const url = new URL(`https://food-delivery.kreosoft.ru/api/basket/dish/${id}`);
	const header = new Headers();
	header.append('Content-Type', 'application/json');
	header.append('Authorization', `Bearer ${token}`);

	method == 'decrease' && url.searchParams.append('increase', true);
	method == 'delete' && url.searchParams.append('increase', false);

	const response = await fetch(url, {
		method: method == 'increase' ? 'POST' : 'DELETE',
		headers: header,
	});

	if (response.ok) {
		if (method == 'increase') return { message: 'Food added to cart' };
		if (method == 'decrease') return { message: 'Food removed from cart' };
		if (method == 'delete') return { message: 'Food deleted from cart' };
		throw new Error('Unhandled method');
	}

	if (response.status === 401) throw new Unauthorized('Your session has expired');
	return { message: 'Something went wrong' };
}

function setFilterValue(filterForm) {
	const param = new URLSearchParams(window.location.search);
	const categories = param.getAll('categories');
	const sorting = param.get('sorting');
	const vegetarian = param.get('vegetarian');

	$('#categories').selectpicker('val', categories);
	$('#sorting').selectpicker('val', sorting);
	vegetarian && (filterForm.querySelector('#vegetarian').checked = true);
}

function renderEmptyCard(container) {
	container.innerHTML = `
	<div class="col-12">
		<div class="d-flex py-5 justify-content-center align-items-center text-center">
				<h6>No Dishes Found</h6>
		</div>
	</div>`;
}

function renderCard(dishes, container) {
	const carts = JSON.parse(localStorage.getItem('carts')) || [];
	container.innerHTML = '';

	dishes.forEach((dish) => {
		const card = document.createElement('div');

		let { id, name, image, category, description, price, rating, vegetarian } = dish;
		rating = Math.round(rating / 2);

		const cart = carts.find((cart) => cart.id === id);

		card.innerHTML = `
		<div class="card h-100 rounded-3 overflow-hidden position-relative" class="foodCard">
			<a href="food.html?id=${id}" class="card-img-container">
				<img
				src="${image}"
				class="card-img-top"
				alt="${name}" />
			</a>
			<div class="p-4">
				<h6>${name}</h6>
				<div class="d-flex justify-content-between align-item-center">
					<p>${category}</p>
					<div class="average-rating" aria-label="rating ${rating} out of 5 stars"></div>
				</div>
				<p class="pb-5">${description}</p>
			</div>
			<div class="card-footer w-100 position-absolute bottom-0 bg-white d-flex justify-content-between align-items-center">
				<span>$${price}</span>
				<div id="buttonContainer">
				</div>
			</div>
			${vegetarian ? '<span class="vegetarian position-absolute top-0 end-0 px-2 py-1 rounded-3 m-2">Vegetarian</span>' : ''}
		</div>
		`;

		if (cart) {
			const buttonContainer = card.querySelector('#buttonContainer');
			buttonContainer.innerHTML = `
			<div class="d-flex align-items-center justify-content-end">
			<button class="btn btn-deats square" data-method="decrease">-</button>
			<span class="mx-3" id="amount">${cart.amount}</span>
			<button class="btn btn-deats square" data-method="increase">+</button>
			</div>
			`;
		} else {
			const buttonContainer = card.querySelector('#buttonContainer');
			buttonContainer.innerHTML = `
				<button class="btn btn-deats">
					<span
						class="spinner-border spinner-border-sm me-2 d-none"
						role="status"
						aria-hidden="true"
						>
					</span>
					Add to cart
				</button>
			`;
		}

		card.id = 'foodCard';
		card.classList.add('col-12', 'col-md-6', 'col-lg-4', 'col-xl-3');
		card.setAttribute('data-id', id);

		const starRating = card.querySelector('.average-rating');
		Array.from({ length: 5 }).forEach((_, index) => {
			const star = document.createElement('span');
			star.classList.add('star');
			index < rating && star.classList.add('active');
			starRating.appendChild(star);
		});

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
