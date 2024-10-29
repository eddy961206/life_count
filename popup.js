document.addEventListener('DOMContentLoaded', function () {
    // 기존 요소 가져오기
    const appName = document.getElementById('appName');
    const appTitle = document.getElementById('appTitle');
    const contactMessage = document.getElementById('contactMessage');
    
    const birthdateInput = document.getElementById('birthdate');
    const deathdateInput = document.getElementById('deathdate');
    const calculateButton = document.getElementById('calculate');
    const livedDaysDiv = document.getElementById('lived-days');
    const remainingDaysDiv = document.getElementById('remaining-days');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const percentageDiv = document.getElementById('percentage');

    // 초기 텍스트 설정
    appName.textContent = chrome.i18n.getMessage('appName');
    appTitle.textContent = chrome.i18n.getMessage('appName');
    contactMessage.textContent = chrome.i18n.getMessage('contactMessage');

    document.querySelector('label[for="birthdate"]').textContent = chrome.i18n.getMessage('enterBirthdate');
    document.querySelector('label[for="deathdate"]').textContent = chrome.i18n.getMessage('enterDeathdate');
    calculateButton.textContent = chrome.i18n.getMessage('calculate');

    chrome.storage.local.get(['birthdate', 'deathdate'], function (result) {
        if (result.birthdate) birthdateInput.value = result.birthdate;
        if (result.deathdate) deathdateInput.value = result.deathdate;
        if (result.birthdate && result.deathdate) calculateDays();
    });

    // 오늘 날짜를 YYYY-MM-DD 형식으로 변환하는 함수
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 오늘 날짜 설정
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // deathdate 입력필드의 최소값을 내일로 설정
    deathdateInput.min = formatDate(tomorrow);

    // 날짜 입력 필드에 대한 이벤트 리스너 추가
    birthdateInput.addEventListener('input', function(e) {
        validateDateInput(birthdateInput);
    });

    deathdateInput.addEventListener('input', function(e) {
        validateDateInput(deathdateInput);
    });

    function validateDateInput(inputElement) {
        const value = inputElement.value;
        
        // YYYY-MM-DD 형식의 정규식
        const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        
        if (!dateRegex.test(value)) {
            return;
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) {
            inputElement.value = '';
        }
    }    

    calculateButton.addEventListener('click', calculateDays);

    function calculateDays() {
        const birthdateValue = birthdateInput.value;
        const deathdateValue = deathdateInput.value;

        if (!birthdateValue || !deathdateValue) {
            alert(chrome.i18n.getMessage('enterBothDates'));
            return;
        }

        const birthDate = new Date(birthdateValue);
        const deathDate = new Date(deathdateValue);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (birthDate >= deathDate) {
            alert(chrome.i18n.getMessage('deathDateAfterBirth'));
            return;
        }

        if (deathDate <= today + 1) {
            alert(chrome.i18n.getMessage('deathDateNotToday'));
            return;
        }

        chrome.storage.local.set({
            'birthdate': birthdateValue,
            'deathdate': deathdateValue
        });

        // 살아온 일수 계산
        const livedTime = today - birthDate;
        const livedDays = Math.floor(livedTime / (1000 * 60 * 60 * 24));

        // 현재 나이 계산 (소수점 첫째자리까지)
        const currentAge = (livedTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

        // 사망 시 나이 계산
        const totalLifeTime = deathDate - birthDate;
        const deathAge = (totalLifeTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);

        // 남은 시간 계산
        const remainingTime = deathDate - today;
        const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));

        // 남은 기간을 년, 월, 일로 변환
        const remainingYears = Math.floor(remainingDays / 365.25);
        const remainingMonths = Math.floor((remainingDays % 365.25) / 30.44);
        const remainingDaysLeft = Math.floor(remainingDays % 30.44);

        // 전체 수명
        const totalLifespan = deathDate - birthDate;
        const totalDays = Math.floor(totalLifespan / (1000 * 60 * 60 * 24));

        // 진행률 계산
        const progressPercentage = (livedDays / totalDays) * 100;

        // 결과 표시
        livedDaysDiv.innerText = chrome.i18n.getMessage('livedDays', 
            [livedDays.toLocaleString(), currentAge]);

        if (remainingDays < 0) {
            remainingDaysDiv.innerText = chrome.i18n.getMessage('alreadyPassed');
            progressContainer.style.display = 'none';
        } else {
            remainingDaysDiv.innerText = chrome.i18n.getMessage('remainingDays', 
                [remainingDays.toLocaleString(), remainingYears, remainingMonths, remainingDaysLeft, deathAge]);
            progressBar.style.width = `${progressPercentage}%`;
            percentageDiv.innerText = chrome.i18n.getMessage('progressPercentage', 
                [progressPercentage.toFixed(2)]);
            progressContainer.style.display = 'block';
        }
    }
});