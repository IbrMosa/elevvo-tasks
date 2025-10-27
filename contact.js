(function() {
	var fullNameInput = document.getElementById('fullName');
	var emailInput = document.getElementById('email');
	var subjectInput = document.getElementById('subject');
	var messageInput = document.getElementById('message');
	var form = document.querySelector('.contact-form');
	var overlay = document.getElementById('successOverlay');
	var overlayClose = document.getElementById('overlayClose');

	function validateFullName() {
		var value = fullNameInput.value.trim();
		var nameParts = value.split(/\s+/).filter(Boolean);
		if (nameParts.length < 3) {
			fullNameInput.setCustomValidity('write no less than 3 names in full name');
			return false;
		} else {
			fullNameInput.setCustomValidity('');
			return true;
		}
	}

	function validateEmail() {
		var raw = emailInput.value;
		var value = raw.trim();
		var hasSpaces = /\s/.test(raw);
		var hasAt = value.indexOf('@') !== -1;
		var hasDotCom = value.toLowerCase().includes('.com');
		if (!value || (hasSpaces || !hasAt || !hasDotCom)) {
			emailInput.setCustomValidity('Wrong email format');
			return false;
		} else {
			emailInput.setCustomValidity('');
			return true;
		}
	}

	function validateSubject() {
		var value = subjectInput.value.trim();
		if (!value) {
			subjectInput.setCustomValidity('Write a subject');
			return false;
		} else {
			subjectInput.setCustomValidity('');
			return true;
		}
	}

	function validateMessage() {
		var value = messageInput.value.trim();
		if (!value) {
			messageInput.setCustomValidity('Write a message');
			return false;
		} else {
			messageInput.setCustomValidity('');
			return true;
		}
	}

	fullNameInput.addEventListener('input', validateFullName);
	emailInput.addEventListener('input', validateEmail);
	subjectInput.addEventListener('input', validateSubject);
	messageInput.addEventListener('input', validateMessage);

	form.addEventListener('submit', function(e) {
		var ok = true;
		if (!validateFullName()) { ok = false; fullNameInput.reportValidity(); }
		if (!validateEmail()) { ok = false; emailInput.reportValidity(); }
		if (!validateSubject()) { ok = false; subjectInput.reportValidity(); }
		if (!validateMessage()) { ok = false; messageInput.reportValidity(); }
		if (!ok) { e.preventDefault(); return; }
		// All good: show success overlay in place
		e.preventDefault();
		form.reset();
		overlay.classList.remove('hidden');
	});

	overlayClose.addEventListener('click', function() {
		window.location.href = 'contact.html';
	});
})();
