document.addEventListener('DOMContentLoaded', () => {
	const bootstrap = window.bootstrap;

	const foodContainer = document.getElementById('foodContainer');

	async function checkCanRate(id) {
		const token = localStorage.getItem('token');

		const url = new URL(`https://food-delivery.kreosoft.ru/api/dish/${id}/rating/check`);
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

	fetchSingleFood()
		.then(async (data) => {
			renderFood(data, foodContainer);

			const originalRating = Math.round(data.rating / 2);
			const starRatingForm = document.querySelector('.star-rating');

			starRatingForm.addEventListener('change', async (event) => {
				event.preventDefault();

				try {
					const canRate = await checkCanRate(data.id);

					if (!canRate) {
						triggerToast('You do not have permission to rate this dish');
						const radio = starRatingForm.querySelectorAll('.star-input');
						originalRating > 0 && (radio[5 - originalRating].checked = true);
						return;
					}

					const token = localStorage.getItem('token');

					const url = new URL(`https://food-delivery.kreosoft.ru/api/dish/${data.id}/rating`);
					const header = new Headers();
					header.append('Content-Type', 'application/json');
					header.append('Authorization', `Bearer ${token}`);

					const response = await fetch(url, {
						method: 'POST',
						headers: header,
						body: JSON.stringify({
							rating: event.target.value * 2,
						}),
					});

					if (response.status === 401) throw new Unauthorized('Your session has expired');
					if (response.ok) triggerToast('Dish rated successfully');
				} catch (error) {
					if (error instanceof Unauthorized) {
						localStorage.removeItem('token');
						localStorage.removeItem('carts');

						triggerToast(error.message);
						setTimeout(() => {
							window.location.href = 'login.html';
						}, 1500);
					} else {
						console.error(error);
						triggerToast(error.message);
						setTimeout(() => {
							window.location.reload();
						}, 1500);
					}
				}
			});
		})
		.catch((error) => {
			console.error(error);
			triggerToast(error.message);
			setTimeout(() => {
				window.location.href = 'menu.html';
			}, 1500);
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

async function fetchSingleFood() {
	const id = new URLSearchParams(window.location.search).get('id');
	if (!id) throw new Error('Missing id parameter');

	const url = new URL(`https://food-delivery.kreosoft.ru/api/dish/${id}`);

	const response = await fetch(url);
	const data = await response.json();
	return data;
}

function renderFood(dish, container) {
	const createStar = (index) => `
		<input class="star-input" type="radio" id="star${index}" name="star-input" value="${index}" />
		<label class="star-label" for="star${index}" title="${index} star">${index} star</label>
	`;

	container.innerHTML = '';
	const card = document.createElement('div');

	let { id, name, image, category, description, price, rating, vegetarian } = dish;
	rating = Math.round(rating / 2);

	card.innerHTML = `
	<div class="col-12 col-xl-5 mb-4 mb-xl-0 position-relative overflow-hidden rounded-3 card-img-container showcase">
		<img src="${image}" alt="${name}" class="w-100 card-img-top">
		<p class="position-absolute top-0 start-0 vegetarian px-2 py-1 m-3 rounded-3">${category}</p>
	</div>

	<div class="col-12 col-xl-7 ps-xl-5">
		<h3>${name}</h3>
			<div class="d-flex flex-row justify-content-between align-item-center">
			<p>${category}</p>
			<form class="star-rating"></form>
		</div>
		<p class="text-muted lh-lg">
			${description}
		</p>
		<span>$${price}</span>
	</div>
	`;

	card.classList.add('row', 'g-0');

	const starRating = card.querySelector('.star-rating');
	Array.from({ length: 5 }, (_, index) => {
		starRating.innerHTML += createStar(5 - index);
	});

	const radio = starRating.querySelectorAll('.star-input');
	rating > 0 && (radio[5 - rating].checked = true);

	container.appendChild(card);
}

class Unauthorized extends Error {
	constructor(message) {
		super(message);
		this.name = 'Unauthorized';
	}
}
