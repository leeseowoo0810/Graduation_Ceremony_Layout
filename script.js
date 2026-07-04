/**
 * 수료식 배치도 조회 시스템 - script.js
 * 
 * 주요 기능:
 * 1. 배치도 데이터 로드 (JSON fetch 및 로컬 실행 대비 fallbackData 연동)
 * 2. DocumentFragment를 활용한 고속 DOM 렌더링 (그리드 생성)
 * 3. 메인 선택 화면과 중대별 확장 상세 화면의 스위칭 제어
 * 4. 훈련병 조회 및 위치 자동 확대, 타겟 좌석 하이라이트/스크롤 연동
 */

let data = null;

// DOM 캐시 객체
const DOM = {
    companySelect: null,
    nameInput: null,
    phoneInput: null,
    searchBtn: null,
    backBtn: null,
    resultCard: null,
    resultBody: null,
    selectionView: null,
    detailView: null,
    activeTitle: null,
    companyWrappers: {}
};

// 로컬 실행(file://) 시 CORS 제한으로 fetch가 실패할 경우 사용할 백업 데이터
// ⚠️ data.json 수정 시 이 fallbackData도 반드시 함께 수정해야 합니다.
const fallbackData = {
    "layout": {
        "9": { "columns": 10, "lines": 20 },
        "10": { "columns": 4, "lines": 14 },
        "11": { "columns": 4, "lines": 14 },
        "12": { "columns": 4, "lines": 14 }
    },
    "soldiers": [
        {
            "company": "9",
            "number": "001",
            "name": "이승우",
            "phone": "123",
            "position": "2-7"
        },
        {
            "company": "10",
            "number": "015",
            "name": "김민재",
            "phone": "456",
            "position": "3-5"
        },
        {
            "company": "11",
            "number": "088",
            "name": "손흥민",
            "phone": "789",
            "position": "1-10"
        },
        {
            "company": "12",
            "number": "104",
            "name": "황희찬",
            "phone": "012",
            "position": "4-2"
        }
    ]
};

// 페이지 로드 시 라이프사이클 시작
window.addEventListener("DOMContentLoaded", async () => {
    cacheDOMElements();
    await loadDatabase();
});

/**
 * 자주 사용되는 DOM 엘리먼트들을 미리 캐싱
 */
function cacheDOMElements() {
    DOM.companySelect = document.getElementById("company");
    DOM.nameInput = document.getElementById("nameInput");
    DOM.phoneInput = document.getElementById("phoneInput");
    DOM.searchBtn = document.getElementById("searchBtn");
    DOM.backBtn = document.getElementById("backBtn");
    DOM.resultCard = document.getElementById("resultCard");
    DOM.resultBody = document.getElementById("resultBody");
    DOM.selectionView = document.getElementById("selectionView");
    DOM.detailView = document.getElementById("detailView");
    DOM.activeTitle = document.getElementById("activeTitle");

    // 중대별 래퍼 캐싱
    for (let c = 9; c <= 12; c++) {
        DOM.companyWrappers[c] = document.getElementById("wrapper" + c);
    }
}

/**
 * JSON 데이터를 비동기로 패치하고 에러 발생 시 fallback 데이터를 연동
 */
async function loadDatabase() {
    try {
        const response = await fetch("./data.json");
        data = await response.json();
    } catch (error) {
        console.warn("로컬 서버 미가동으로 파일 시스템 브라우징(CORS 제한) 모드로 감지되었습니다. 백업 데이터를 사용합니다.");
        data = fallbackData;
    } finally {
        if (data && data.layout) {
            createLayouts();
            initEventListeners();
        } else {
            showError("데이터베이스를 구성하지 못했습니다. 새로고침해 주세요.");
        }
    }
}

/**
 * 각 중대의 그리드 배치도 생성 (DocumentFragment로 성능 최적화)
 */
function createLayouts() {
    const layouts = data.layout;

    for (const company in layouts) {
        const companyBox = document.getElementById("company" + company);
        if (!companyBox) continue;

        const { columns, lines } = layouts[company];
        
        // CSS Grid 열 비율 적용
        companyBox.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

        // 리플로우 방지를 위한 DocumentFragment 생성
        const fragment = document.createDocumentFragment();

        for (let line = 1; line <= lines; line++) {
            for (let column = 1; column <= columns; column++) {
                const seat = document.createElement("div");
                seat.className = "seat";
                seat.dataset.company = company;
                seat.dataset.position = `${column}-${line}`;
                seat.textContent = `${column}-${line}`;
                fragment.appendChild(seat);
            }
        }
        companyBox.appendChild(fragment);
    }
}

/**
 * 이벤트 리스너 등록
 */
function initEventListeners() {
    // 1단계: 중대 선택 버튼 클릭 시 해당 중대 확장
    document.querySelectorAll(".comp-select-btn").forEach(button => {
        button.addEventListener("click", () => {
            const company = button.dataset.target;
            showCompany(company);
        });
    });

    // 2단계: 이전으로 돌아가기 버튼 클릭
    DOM.backBtn.addEventListener("click", showSelectionView);

    // 검색 클릭
    DOM.searchBtn.addEventListener("click", searchPerson);

    // 엔터키 입력 시 검색 연동
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            const activeId = document.activeElement.id;
            if (["nameInput", "phoneInput", "company"].includes(activeId)) {
                searchPerson();
            }
        }
    });

    // 드롭다운 필터 변경 시 해당 중대 버튼 강조 표시 (상세 뷰 전환 제거)
    DOM.companySelect.addEventListener("change", function() {
        // 기존 모든 중대 버튼의 강조(highlighted) 제거
        document.querySelectorAll(".comp-select-btn").forEach(btn => {
            btn.classList.remove("highlighted");
        });

        if (this.value) {
            // 선택된 중대의 메인 화면 버튼 강조 표시
            const targetBtn = document.querySelector(`.comp-select-btn[data-target="${this.value}"]`);
            if (targetBtn) {
                targetBtn.classList.add("highlighted");
            }
        }
    });
}

/**
 * 특정 중대 배치도를 확장해서 보여주는 제어 함수
 */
function showCompany(company) {
    clearHighlights();

    // 드롭다운 값 동기화
    DOM.companySelect.value = company;

    // 메인 화면 숨기고 상세 화면 열기
    DOM.selectionView.style.display = "none";
    DOM.detailView.style.display = "block";
    DOM.activeTitle.textContent = `${company}중대 배치도`;

    // 모든 중대 숨기고 타겟 중대만 보여줌
    for (const c in DOM.companyWrappers) {
        if (DOM.companyWrappers[c]) {
            DOM.companyWrappers[c].style.display = (c === company) ? "block" : "none";
        }
    }
}

/**
 * 메인 선택 화면으로 전환하는 제어 함수
 */
function showSelectionView() {
    clearHighlights();

    // 드롭다운 초기화
    DOM.companySelect.value = "";

    // 뷰 전환
    DOM.detailView.style.display = "none";
    DOM.selectionView.style.display = "block";
    
    // 결과 카드 초기화 및 숨김
    DOM.resultCard.style.display = "none";
    DOM.resultBody.innerHTML = "이름과 전화번호를 입력해주세요.";
}

/**
 * 기존 좌석 및 중대 버튼 하이라이트 제거
 */
function clearHighlights() {
    document.querySelectorAll(".seat.selected-seat").forEach(seat => {
        seat.classList.remove("selected-seat");
    });
    document.querySelectorAll(".comp-select-btn.highlighted").forEach(btn => {
        btn.classList.remove("highlighted");
    });
}

/**
 * 훈련병 검색 로직 및 스크롤 포커싱
 */
function searchPerson() {
    const company = DOM.companySelect.value;
    const name = DOM.nameInput.value.trim();
    const phone = DOM.phoneInput.value.trim();

    // 미입력 검증
    if (!name || !phone) {
        showError("이름과 전화번호를 모두 입력해 주세요.");
        return;
    }

    clearHighlights();

    // 검색 (선택한 중대 필터링 포함)
    const found = data.soldiers.find(s => {
        const companyMatch = !company || s.company === company;
        return companyMatch && s.name === name && s.phone === phone;
    });

    DOM.resultCard.style.display = "block";

    if (!found) {
        DOM.resultBody.innerHTML = `
        <div style="text-align: center; padding: 10px 0;">
            <div style="font-size: 17px; font-weight: 700; color: #f87171; margin-bottom: 8px;">
                일치하는 정보가 없습니다.
            </div>
            <div style="font-size: 13.5px; color: #9ca3af; line-height: 1.6;">
                중대를 모르시는 경우에는 메인 화면으로 돌아가<br>
                <strong style="color: #f3f4f6;">중대 선택 없이 이름과 전화번호만</strong> 입력 후 조회해 보세요.
            </div>
        </div>
        `;
        return;
    }

    // 결과 정보 렌더링
    DOM.resultBody.innerHTML = `
    <div class="result-details">
        <div class="result-name">${found.name}</div>
        <div class="result-meta">${found.company}중대 · 교번 ${found.number}</div>
        <div class="result-location">📍 위치 : ${found.position}</div>
    </div>
    `;

    // 뷰 자동 이동 및 전환
    showCompany(found.company);

    // 하이라이트 및 스크롤
    const seat = document.querySelector(
        `.seat[data-company="${found.company}"][data-position="${found.position}"]`
    );

    if (seat) {
        seat.classList.add("selected-seat");
        
        // 레이아웃 렌더링 시간 고려한 지연 실행
        setTimeout(() => {
            seat.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }, 120);
    }
}

/**
 * 에러 메시지 팝업 출력 보조 함수
 */
function showError(msg) {
    DOM.resultCard.style.display = "block";
    DOM.resultBody.innerHTML = `
    <div style="color: #f87171; font-weight: 600; text-align: center; padding: 5px 0;">
        ⚠️ ${msg}
    </div>`;
}
