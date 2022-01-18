var draggableOrder = false;

function checkDraggables() {
	return new Promise(function (resolve) {
		let conts = document.querySelectorAll('[data-draggable-cont]');
		let indexes = {};
		conts.forEach(cont => {
			Array.from(cont.children).forEach(el => {
				if (el.getAttribute('data-draggable-set') || el.getAttribute('data-draggable-ignore'))
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

				if (el.querySelector('[data-draggable-grip]')) {
					el.querySelector('[data-draggable-grip]').addEventListener('mousedown', (function (el) {
						return function (event) {
							draggableOrderStart(event, el);
						};
					})(el));
				} else {
					el.addEventListener('mousedown', draggableOrderStart);
				}

				el.setAttribute('data-draggable-set', '1');
			});
		});

		resolve();
	});
}

window.addEventListener('DOMContentLoaded', () => {
	onHtmlChange(checkDraggables);
});

function draggableOrderStart(event, element) {
	if (event.button !== 0)
		return;
	if (typeof element === 'undefined')
		element = this;

	let mouseCoords = getMouseCoords(event);
	let contCoords = getElementCoords(element.parentNode);

	draggableOrder = {
		"element": element,
		"eventTarget": event.target,
		"index": parseInt(element.getAttribute('data-draggable-index')),
		"cont": element.parentNode,
		"startX": element.offsetLeft,
		"startY": element.offsetTop,
		"mouseStartX": mouseCoords.x,
		"mouseStartY": mouseCoords.y,
		"scrollStartX": element.parentNode.scrollLeft,
		"scrollStartY": element.parentNode.scrollTop,
		"contCoords": contCoords,
		"target": null,
		"moved": false,
		"elements": []
	};

	let elParent = 0;
	if (element.getAttribute('data-draggable-parent'))
		elParent = element.getAttribute('data-draggable-parent');

	Array.from(element.parentNode.children).forEach(el => {
		if (el.getAttribute('data-draggable-ignore'))
			return;

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

	if (element.style.width)
		element.setAttribute('data-dragging-orig-width', element.style.width);

	element.style.width = element.offsetWidth + 'px';

	draggableOrder['placeholder'] = makeDraggablePlaceHolder(element);

	element.addClass('dragging-order');

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

	// Rimuovo selezione testo
	if (document.selection)
		document.selection.empty()
	else
		window.getSelection().removeAllRanges()

	let mouseCoords = getMouseCoords(event);
	let contCoords = getElementCoords(draggableOrder.cont);

	let diffX = (mouseCoords.x - draggableOrder.mouseStartX) + (draggableOrder.cont.scrollLeft - draggableOrder.scrollStartX) + (draggableOrder.contCoords.x - contCoords.x);
	let diffY = (mouseCoords.y - draggableOrder.mouseStartY) + (draggableOrder.cont.scrollTop - draggableOrder.scrollStartY) + (draggableOrder.contCoords.y - contCoords.y);

	draggableOrder.element.style.top = (draggableOrder.startY + diffY) + 'px';
	draggableOrder.element.style.left = (draggableOrder.startX + diffX) + 'px';

	let nearest = false, mouseCoordsInCont = getMouseCoordsInElement(event, draggableOrder.cont);
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
		if (draggableOrder['target'] !== draggableOrder['element'])
			draggableOrder['moved'] = true;
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

	if (draggableOrder.element.getAttribute('data-dragging-orig-width'))
		draggableOrder.element.style.width = draggableOrder.element.getAttribute('data-dragging-orig-width');
	else
		draggableOrder.element.style.removeProperty('width');

	draggableOrder.element.removeClass('dragging-order');
	draggableOrder.element.style.removeProperty('top');
	draggableOrder.element.style.removeProperty('left');
	placeOrderingElement(draggableOrder.element, draggableOrder['target']);
	draggableOrder.placeholder.parentNode.removeChild(draggableOrder.placeholder);

	realignOrder(draggableOrder.cont);

	if (draggableOrder.element === draggableOrder.target && !draggableOrder['moved']) {
		draggableOrder.eventTarget.click();
	} else if (draggableOrder.cont.getAttribute('data-draggable-callback')) {
		eval('var callback = function(element, target){ ' + draggableOrder.cont.getAttribute('data-draggable-callback') + ' }');
		callback.call(draggableOrder.element, element, target);
	}

	draggableOrder = false;
}

function realignOrder(cont) {
	let min = {};

	Array.from(cont.children).forEach(el => {
		if (el.getAttribute('data-draggable-ignore'))
			return;

		let index = parseInt(el.getAttribute('data-draggable-index'));

		let parent = 0;
		if (el.getAttribute('data-draggable-parent'))
			parent = el.getAttribute('data-draggable-parent');

		if (typeof min[parent] === 'undefined' || min[parent] > index)
			min[parent] = index;
	});

	Array.from(cont.children).forEach(el => {
		if (el.getAttribute('data-draggable-ignore'))
			return;

		let parent = 0;
		if (el.getAttribute('data-draggable-parent'))
			parent = el.getAttribute('data-draggable-parent');

		el.setAttribute('data-draggable-index', min[parent]);
		min[parent]++;
	});
}

function getDraggableList(name) {
	let cont = document.querySelector('[data-draggable-cont="' + name + '"]');

	let list = [];
	Array.from(cont.children).forEach(element => {
		if (element.getAttribute('data-draggable-name'))
			list.push(element.getAttribute('data-draggable-name'));
		else if (element.getAttribute('data-draggable-index'))
			list.push(element.getAttribute('data-draggable-index'));
		else
			list.push(null);
	});
	return list;
}
