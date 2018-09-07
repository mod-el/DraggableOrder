var draggableOrder = false;

function checkDraggables() {
	return new Promise(function (resolve) {
		let conts = document.querySelectorAll('[data-draggable-cont]');
		let indexes = {};
		conts.forEach(cont => {
			Array.from(cont.children).forEach(el => {
				if (el.getAttribute('data-draggable-set'))
					return;

				if (!el.getAttribute('data-draggable-index')) {
					let parent = 0;
					if (el.getAttribute('data-draggable-parent'))
						parent = el.getAttribute('data-draggable-parent');

					if (typeof indexes[parent] === 'undefined')
						indexes[parent] = 0;
					indexes[parent]++;

					el.setAttribute('data-draggable-index', indexes[parent]);
				}

				el.addEventListener('mousedown', draggableOrderStart);
				el.setAttribute('data-draggable-set', '1');
			});
		});

		resolve();
	});
}

window.addEventListener('DOMContentLoaded', () => {
	onHtmlChange(checkDraggables);
});

function draggableOrderStart(event) {
	if (event.button !== 0)
		return;

	let mouseCoords = getMouseCoords(event);

	draggableOrder = {
		"element": this,
		"index": parseInt(this.getAttribute('data-draggable-index')),
		"cont": this.parentNode,
		"startX": this.offsetLeft,
		"startY": this.offsetTop,
		"mouseStartX": mouseCoords.x,
		"mouseStartY": mouseCoords.y,
		"scrollStartX": this.parentNode.scrollLeft,
		"scrollStartY": this.parentNode.scrollTop,
		"target": null,
		"elements": []
	};

	let elParent = 0;
	if (this.getAttribute('data-draggable-parent'))
		elParent = this.getAttribute('data-draggable-parent');

	Array.from(this.parentNode.children).forEach(el => {
		let parent = 0;
		if (el.getAttribute('data-draggable-parent'))
			parent = el.getAttribute('data-draggable-parent');
		if (parent !== elParent)
			return;

		draggableOrder.elements.push({
			"x1": el.offsetLeft,
			"y1": el.offsetTop,
			"x2": el.offsetLeft + el.offsetWidth - 1,
			"y2": el.offsetTop + el.offsetHeight - 1,
			"element": el
		});
	});

	draggableOrder['placeholder'] = makeDraggablePlaceHolder(this);

	this.addClass('dragging-order');

	draggableMove(event);
}

window.addEventListener('mousemove', draggableMove);
window.addEventListener('mouseup', draggableRelease);

function makeDraggablePlaceHolder(element) {
	let placeholder = document.createElement('div');
	placeholder.className = 'dragging-placeholder';
	placeholder.style.opacity = 0;
	placeholder.style.display = window.getComputedStyle(element).display;
	placeholder.style.width = element.offsetWidth + 'px';
	placeholder.style.height = element.offsetHeight + 'px';
	placeholder = element.parentNode.insertBefore(placeholder, element);
	setTimeout(() => {
		placeholder.style.opacity = 1;
	}, 100);
	return placeholder;
}

function draggableMove(event) {
	if (event.button !== 0 || !draggableOrder)
		return;

	let mouseCoords = getMouseCoords(event);

	let diffX = (mouseCoords.x - draggableOrder.mouseStartX) + (draggableOrder.cont.scrollLeft - draggableOrder.scrollStartX);
	let diffY = (mouseCoords.y - draggableOrder.mouseStartY) + (draggableOrder.cont.scrollTop - draggableOrder.scrollStartY);

	draggableOrder.element.style.top = (draggableOrder.startY + diffY) + 'px';
	draggableOrder.element.style.left = (draggableOrder.startX + diffX) + 'px';

	var nearest = false, mouseCoordsInCont = getMouseCoordsInElement(event, draggableOrder.cont);
	mouseCoordsInCont.x += draggableOrder.cont.scrollLeft;
	mouseCoordsInCont.y += draggableOrder.cont.scrollTop;
	draggableOrder.elements.forEach(el => {
		let d = Math.abs(shortestDistance(el, mouseCoordsInCont));
		if (nearest === false || d < nearest.distance) {
			nearest = {
				'element': el.element,
				'distance': d
			};
		}
	});

	if (nearest) {
		draggableOrder['target'] = nearest.element;
		placeOrderingElement(draggableOrder.placeholder, draggableOrder['target']);
	}
}

function shortestDistance(element, point) {
	let dx = Math.max(element.x1 - point.x, 0, point.x - element.x2);
	let dy = Math.max(element.y1 - point.y, 0, point.y - element.y2);
	return Math.sqrt(dx * dx + dy * dy);
}

function placeOrderingElement(element, target) {
	if (!draggableOrder)
		return;

	let targetOrder = parseInt(target.getAttribute('data-draggable-index'));
	if (targetOrder <= draggableOrder.index)
		draggableOrder.cont.insertBefore(element, target);
	else
		draggableOrder.cont.insertBefore(element, target.nextSibling);
}

function draggableRelease(event) {
	if (event.button !== 0 || !draggableOrder)
		return;

	let element = {
		'id': draggableOrder.element.getAttribute('data-draggable-id'),
		'idx': draggableOrder.index
	};
	let target = {
		'id': draggableOrder['target'].getAttribute('data-draggable-id'),
		'idx': parseInt(draggableOrder['target'].getAttribute('data-draggable-index'))
	};

	draggableOrder.element.removeClass('dragging-order');
	draggableOrder.element.style.top = '';
	draggableOrder.element.style.left = '';
	placeOrderingElement(draggableOrder.element, draggableOrder['target']);
	draggableOrder.placeholder.parentNode.removeChild(draggableOrder.placeholder);

	if (draggableOrder.cont.getAttribute('data-draggable-callback')) {
		eval('var callback = function(id, targetIdx, elementIdx){ ' + draggableOrder.cont.getAttribute('data-draggable-callback') + ' }');
		callback.call(null, element, target);
	}

	realignOrder(draggableOrder.cont);

	draggableOrder = false;
}

function realignOrder(cont) {
	let min = {};

	Array.from(cont.children).forEach(el => {
		let index = parseInt(el.getAttribute('data-draggable-index'));

		let parent = 0;
		if (el.getAttribute('data-draggable-parent'))
			parent = el.getAttribute('data-draggable-parent');

		if (typeof min[parent] === 'undefined' || min[parent] > index)
			min[parent] = index;
	});

	Array.from(cont.children).forEach(el => {
		let parent = 0;
		if (el.getAttribute('data-draggable-parent'))
			parent = el.getAttribute('data-draggable-parent');

		el.setAttribute('data-draggable-index', min[parent]);
		min[parent]++;
	});
}