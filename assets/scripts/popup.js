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
        livedDaysDiv.html(chrome.i18n.getMessage('livedDays', 
            [livedDays.toLocaleString(), currentAge])
            .replace(/\n/g, '<br>'));

        if (remainingDays < 0) {
            remainingDaysDiv.text(chrome.i18n.getMessage('alreadyPassed'));
            progressContainer.hide();
            $('#time-value-container').hide();
        } else {
            remainingDaysDiv.html(chrome.i18n.getMessage('remainingDays', 
                [remainingDays.toLocaleString(), remainingYears, remainingMonths, remainingDaysLeft, deathAge])
                .replace(/\n/g, '<br>'));
            progressBar.css('width', `${progressPercentage}%`);
            percentageDiv.text(chrome.i18n.getMessage('progressPercentage', 
                [progressPercentage.toFixed(2)]));
            progressContainer.show();

            // 시간 가치화 계산
            calculateTimeValue(remainingDays);
        }

        // 그리드 생성 함수 호출
        createLifeGrid(birthDate, deathDate, today);
    }

    // 툴팁 요소 생성
    const tooltip = $('<div class="tooltip"></div>').appendTo('body').hide();

    // 툴팁 위치 조정 함수 추가
    function adjustTooltipPosition(tooltip, x, y, windowWidth, windowHeight) {
        const tooltipWidth = tooltip.outerWidth();
        const tooltipHeight = tooltip.outerHeight();
        
        // 팝업 창 경계 기준 여백
        const margin = 5;
        
        // 기본 위치 (마우스 커서 오른쪽 아래)
        let left = x + 10;
        let top = y + 10;
        
        // 오른쪽 경계 체크
        if (left + tooltipWidth > windowWidth - margin) {
            left = x - tooltipWidth - 10; // 마우스 커서 왼쪽에 표시
        }
        
        // 아래쪽 계 체크
        if (top + tooltipHeight > windowHeight - margin) {
            top = y - tooltipHeight - 10; // 마우스 커서 위에 표시
        }
        
        return { left, top };
    }

    // 그리드 생성 함수
    function createLifeGrid(birthDate, deathDate, today) {
        const gridContainer = $('#life-grid');
        gridContainer.empty();

        const totalWeeks = Math.ceil((deathDate - birthDate) / (1000 * 60 * 60 * 24 * 7));
        const livedWeeks = Math.ceil((today - birthDate) / (1000 * 60 * 60 * 24 * 7));

        // 현재 연도 표시 추가
        let currentYear = birthDate.getFullYear();
        let weekCounter = 0;

        for (let i = 0; i < totalWeeks; i++) {
            // 새로운 연도 시작시 연도 표시
            if (i % 52 === 0) {
                const yearMarker = $('<div>')
                    .addClass('year-marker')
                    .text(chrome.i18n.getMessage('ageYearFormat', [currentYear, Math.floor(i/52)]));
                gridContainer.append(yearMarker);
                currentYear++;
            }

            const cell = $('<div>')
                .addClass('grid-cell')
                .attr('data-week', i);

            // 이미 산 시간은 채우기
            if (i < livedWeeks) {
                cell.addClass('lived');
            }

            // 현재 주 표시
            if (i === livedWeeks) {
                cell.addClass('current');
            }

            // 10년 단위 구분선
            if (i % (52 * 10) === 0) {
                cell.addClass('decade-start');
            }

            // 마우스 이벤트 처리
            cell.on('mousemove', function(e) {
                const weekDate = new Date(birthDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
                const age = Math.floor(i/52);
                const weekOfYear = Math.floor((i % 52) + 1);
                const weekInfo = chrome.i18n.getMessage('weekInfoFormat', [
                    weekDate.getFullYear(),
                    weekDate.getMonth() + 1,
                    age,
                    weekOfYear
                ]);
                
                const position = adjustTooltipPosition(
                    tooltip, 
                    e.pageX, 
                    e.pageY, 
                    $(window).width(), 
                    $(window).height()
                );
                
                tooltip.html(weekInfo.replace('\n', '<br>'))
                    .css({
                        left: position.left,
                        top: position.top
                    })
                    .show();
            }).on('mouseleave', function() {
                tooltip.hide();
            });

            gridContainer.append(cell);
        }
    }

    // 명언 API 호출 및 표시 함수 수정
    async function fetchAndDisplayQuote() {
        try {
            const response = await fetch('https://api.quotable.io/random?tags=life');
            const data = await response.json();
            
            $('.quote-text').text(data.content);
            $('.quote-author').text(data.author);
        } catch (error) {
            console.error('Error fetching quote:', error);
            // API 호출 실패시 기본 명언 표시
            const fallbackQuote = {
                text: "Your time is limited, don't waste it living someone else's life.",
                author: "Steve Jobs"
            };
            $('.quote-text').text(fallbackQuote.text);
            $('.quote-author').text(fallbackQuote.author);
        }
    }

    // 페이지 로드시 명언 표시
    fetchAndDisplayQuote();

    // 탭 전환 로직 수정
    $('.tab-button').on('click', function() {
        const tabId = $(this).data('tab');
        
        $('.tab-button').removeClass('active');
        $(this).addClass('active');
        
        $('.tab-content').removeClass('active');
        $(`#${tabId}-tab`).addClass('active');

        // 명언 표시/숨김 처리
        if (tabId === 'basic') {
            $('.quote-container').show();
        } else {
            $('.quote-container').hide();
        }

        if (tabId === 'grid') {
            const birthDate = new Date($('#birthdate').val());
            const deathDate = new Date($('#deathdate').val());
            if (!isNaN(birthDate.getTime()) && !isNaN(deathDate.getTime())) {
                createLifeGrid(birthDate, deathDate, new Date());
            }
        }
    });

    // 초기 로드 시 기본 탭이 active이므로 명언 표시
    if ($('.tab-button[data-tab="basic"]').hasClass('active')) {
        $('.quote-container').show();
    }

    // 시간 가치화 계산 함수
    function calculateTimeValue(remainingDays) {
        const remainingHours = remainingDays * 24;
        
        // 각 활동별 평균 소요 시간 (시간 단위)
        const timeValues = {
            movie: 2.5,    // 영화 한 편 평균 2.5시간
            book: 5,       // 책 한 권 평균 5시간
            coffee: 0.5,   // 커피 한 잔 여유있게 마시기 30분
            sleep: 8       // 하루 평균 수면 시간 8시간
        };

        // 각 활동별 가능한 횟수 계산
        const movies = Math.floor(remainingHours / timeValues.movie);
        const books = Math.floor(remainingHours / timeValues.book);
        const coffees = Math.floor(remainingHours / timeValues.coffee);
        const sleeps = Math.floor(remainingDays);  // 하루 단위로 계산

        // 숫자 포맷팅 (천 단위 콤마)
        function formatNumber(num) {
            return num.toLocaleString();
        }

        // 결과 표시
        $('#movies-count').text(chrome.i18n.getMessage('countMovie', [formatNumber(movies)]));
        $('#books-count').text(chrome.i18n.getMessage('countBook', [formatNumber(books)]));
        $('#coffee-count').text(chrome.i18n.getMessage('countCoffee', [formatNumber(coffees)]));
        $('#sleep-count').text(chrome.i18n.getMessage('countSleep', [formatNumber(sleeps)]));

        $('#time-value-container').show();
    }

    // 새로운 초기화 코드 추가
    $('#basicInfoTab').text(chrome.i18n.getMessage('basicInfoTab'));
    $('#lifeCalendarTab').text(chrome.i18n.getMessage('lifeCalendarTab'));
    $('#timeValueTitle').text(chrome.i18n.getMessage('timeValueTitle'));
    $('#movieWatching').text(chrome.i18n.getMessage('movieWatching'));
    $('#movieTime').text(chrome.i18n.getMessage('movieTime'));
    $('#bookReading').text(chrome.i18n.getMessage('bookReading'));
    $('#bookTime').text(chrome.i18n.getMessage('bookTime'));
    $('#coffeeTime').text(chrome.i18n.getMessage('coffeeTime'));
    $('#coffeeTimeNote').text(chrome.i18n.getMessage('coffeeTimeNote'));
    $('#goodSleep').text(chrome.i18n.getMessage('goodSleep'));
    $('#sleepTime').text(chrome.i18n.getMessage('sleepTime'));
    $('#gridLegendLived').text(chrome.i18n.getMessage('gridLegendLived'));
    $('#gridLegendCurrent').text(chrome.i18n.getMessage('gridLegendCurrent'));
    $('#gridLegendRemaining').text(chrome.i18n.getMessage('gridLegendRemaining'));
    $('#gridInfoWeek').text(chrome.i18n.getMessage('gridInfoWeek'));
    $('#gridInfoHover').text(chrome.i18n.getMessage('gridInfoHover'));
});