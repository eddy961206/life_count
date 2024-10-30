$(document).ready(function () {
    // 기존 요소 가져오기
    const appName = $('#appName');
    const appTitle = $('#appTitle');
    const contactMessage = $('#contactMessage');
    
    const birthdateInput = $('#birthdate');
    const deathdateInput = $('#deathdate');
    const calculateButton = $('#calculate');
    const livedDaysDiv = $('#lived-days');
    const remainingDaysDiv = $('#remaining-days');
    const progressContainer = $('#progress-container');
    const progressBar = $('#progress-bar');
    const percentageDiv = $('#percentage');

    // 초기 텍스트 설정
    appName.text(chrome.i18n.getMessage('appName'));
    appTitle.text(chrome.i18n.getMessage('appName'));
    contactMessage.text(chrome.i18n.getMessage('contactMessage'));

    $('label[for="birthdate"]').text(chrome.i18n.getMessage('enterBirthdate'));
    $('label[for="deathdate"]').text(chrome.i18n.getMessage('enterDeathdate'));
    calculateButton.text(chrome.i18n.getMessage('calculate'));

    chrome.storage.local.get(['birthdate', 'deathdate'], function (result) {
        if (result.birthdate) birthdateInput.val(result.birthdate);
        if (result.deathdate) deathdateInput.val(result.deathdate);
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
    deathdateInput.attr('min', formatDate(tomorrow));

    // 날짜 입력 필드에 대한 이벤트 리스너 추가
    birthdateInput.on('input', function() {
        validateDateInput(birthdateInput);
    });

    deathdateInput.on('input', function() {
        validateDateInput(deathdateInput);
    });

    function validateDateInput(inputElement) {
        const value = inputElement.val();
        
        // YYYY-MM-DD 형식의 정규식
        const dateRegex = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
        
        if (!dateRegex.test(value)) {
            return;
        }

        const date = new Date(value);
        if (isNaN(date.getTime())) {
            inputElement.val('');
        }
    }    

    calculateButton.on('click', calculateDays);

    function calculateDays() {
        const birthdateValue = birthdateInput.val();
        const deathdateValue = deathdateInput.val();

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
        livedDaysDiv.text(chrome.i18n.getMessage('livedDays', 
            [livedDays.toLocaleString(), currentAge]));

        if (remainingDays < 0) {
            remainingDaysDiv.text(chrome.i18n.getMessage('alreadyPassed'));
            progressContainer.hide();
        } else {
            remainingDaysDiv.text(chrome.i18n.getMessage('remainingDays', 
                [remainingDays.toLocaleString(), remainingYears, remainingMonths, remainingDaysLeft, deathAge]));
            progressBar.css('width', `${progressPercentage}%`);
            percentageDiv.text(chrome.i18n.getMessage('progressPercentage', 
                [progressPercentage.toFixed(2)]));
            progressContainer.show();
        }
    }
});