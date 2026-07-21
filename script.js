/**
 * 수료식 배치도 조회 시스템 - script.js
 *
 * 주요 기능:
 * 1. data.json fetch로 데이터 로드 (response.ok 체크 포함)
 *    → 로컬 file:// 실행 또는 fetch 실패 시 fallbackData 자동 대체
 * 2. DocumentFragment를 활용한 고속 DOM 렌더링 (그리드 생성)
 * 3. 메인 선택 화면과 중대별 확장 상세 화면의 스위칭 제어
 * 4. 훈련병 조회 및 위치 자동 확대, 타겟 좌석 하이라이트/스크롤 연동
 */

let data = null;

/* ==========================================================================
   ⚠️  fallbackData: data.json을 불러오지 못할 경우(로컬 실행 등)에만 사용됩니다.
       data.json을 수정했다면 이 fallbackData도 반드시 함께 동기화하세요.
   ========================================================================== */
const fallbackData = {
    layout: {
        "9":  { columns: 10, lines: 20 },
        "10": { columns: 4,  lines: 14 },
        "11": { columns: 4,  lines: 14 },
        "12": { columns: 4,  lines: 14 }
    },
    soldiers: [
        { company: "9",  number: "001", name: "이승우", birth: "123", position: "2-7"  },
        { company: "10", number: "015", name: "김민재", birth: "456", position: "3-5"  },
        { company: "11", number: "088", name: "손흥민", birth: "789", position: "1-10" },
        { company: "12", number: "104", name: "황희찬", birth: "012", position: "4-2"  }
    ]
};

// DOM 캐시 객체
const DOM = {
    companySelect: null,
    nameInput: null,
    birthInput: null,
    searchBtn: null,
    backBtn: null,
    resultCard: null,
    resultBody: null,
    selectionView: null,
    detailView: null,
    activeTitle: null
};

// 페이지 로드 시 라이프사이클 시작
window.addEventListener("DOMContentLoaded", async () => {
    cacheDOMElements();
    await loadDatabase();
});

/**
 * 주요 DOM 엘리먼트들을 미리 캐싱
 */
function cacheDOMElements() {
    DOM.companySelect  = document.getElementById("company");
    DOM.nameInput      = document.getElementById("nameInput");
    DOM.birthInput     = document.getElementById("birthInput");
    DOM.searchBtn      = document.getElementById("searchBtn");
    DOM.backBtn        = document.getElementById("backBtn");
    DOM.resultCard     = document.getElementById("resultCard");
    DOM.resultBody     = document.getElementById("resultBody");
    DOM.selectionView  = document.getElementById("selectionView");
    DOM.detailView     = document.getElementById("detailView");
    DOM.activeTitle    = document.getElementById("activeTitle");
}

/**
 * data.json을 fetch로 읽어옵니다.
 * - 실패 시 fallbackData로 자동 대체
 */
async function loadDatabase() {
    try {
        const response = await fetch("./data.json");
        if (!response.ok) {
            throw new Error(`data.json 로드 실패 (HTTP ${response.status})`);
        }
        data = await response.json();
        console.log("✅ data.json 로드 성공:", data);
    } catch (error) {
        console.warn("⚠️ data.json 로드 실패, fallbackData를 사용합니다:", error.message);
        data = fallbackData;
    }

    if (data && data.layout) {
        createLayouts();
        initEventListeners();
    } else {
        showError("데이터를 불러오는 데 실패했습니다. 새로고침해 주세요.");
    }
}

/**
 * 각 중대의 그리드 배치도 생성 (data.layout 데이터 기반 완전히 동적 생성)
 */
function createLayouts() {
    const layoutContainer = document.getElementById("companyLayout");
    if (!layoutContainer) return;
    
    layoutContainer.innerHTML = ""; // 기존 마크업 초기화
    
    // 리플로우 방지를 위한 전체 컨테이너 Fragment
    const layoutFragment = document.createDocumentFragment();

    for (const company in data.layout) {
        const { columns, lines } = data.layout[company];

        // 1. 개별 중대 wrapper 생성 (시각적 격리를 위해 고유 테마 클래스 추가)
        const wrapper = document.createElement("div");
        wrapper.className = `company-wrapper company-${company}`;
        wrapper.id = `wrapper${company}`;
        wrapper.style.display = "none"; // 기본 비활성화

        // 2. 중대 영역 헤더 타이틀 생성
        const headerEl = document.createElement("div");
        headerEl.className = "company-card-header";
        headerEl.innerHTML = `
            <span class="company-card-badge">${company}중대</span>
            <span class="company-card-subtitle">${columns}열 × ${lines}행 배치구역</span>
        `;
        wrapper.appendChild(headerEl);

        // 3. 배치도 그리드 박스 생성
        const companyBox = document.createElement("div");
        companyBox.className = "company-box";
        companyBox.id = `company${company}`;
        companyBox.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;

        // 4. 개별 좌석 생성 및 Fragment 추가
        const seatFragment = document.createDocumentFragment();
        for (let line = 1; line <= lines; line++) {
            for (let column = 1; column <= columns; column++) {
                const seat = document.createElement("div");
                seat.className = "seat";
                seat.dataset.company = company;
                seat.dataset.position = `${column}-${line}`;
                seat.textContent = `${column}-${line}`;
                seatFragment.appendChild(seat);
            }
        }
        
        companyBox.appendChild(seatFragment);
        wrapper.appendChild(companyBox);
        layoutFragment.appendChild(wrapper);
    }
    
    layoutContainer.appendChild(layoutFragment);
}

/**
 * 이벤트 리스너 등록
 */
function initEventListeners() {
    // 중대 선택 버튼 클릭 시 해당 중대 상세 전환
    document.querySelectorAll(".comp-select-btn").forEach(button => {
        button.addEventListener("click", () => {
            showCompany(button.dataset.target);
        });
    });

    DOM.backBtn.addEventListener("click", showSelectionView);
    DOM.searchBtn.addEventListener("click", searchPerson);

    // 인풋 엔터키 검색 바인딩
    const inputs = [DOM.nameInput, DOM.birthInput, DOM.companySelect];
    inputs.forEach(input => {
        if (input) {
            input.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    searchPerson();
                }
            });
        }
    });

    // 드롭다운 선택 변경 시 메인화면 버튼 고유 하이라이트 동기화
    DOM.companySelect.addEventListener("change", function () {
        document.querySelectorAll(".comp-select-btn").forEach(btn => {
            btn.classList.remove("highlighted");
        });

        if (this.value) {
            const targetBtn = document.querySelector(`.comp-select-btn[data-target="${this.value}"]`);
            if (targetBtn) targetBtn.classList.add("highlighted");
        }
    });
}

/**
 * 특정 중대 배치도를 확장해서 보여주는 제어 함수
 */
function showCompany(company) {
    clearHighlights();

    DOM.companySelect.value = company;
    DOM.selectionView.style.display = "none";
    DOM.detailView.style.display = "block";
    DOM.activeTitle.textContent = `${company}중대 배치도`;

    // 모든 중대 wrapper를 순회하여 타겟만 표시 (완전 동적 제어)
    document.querySelectorAll(".company-wrapper").forEach(wrapper => {
        wrapper.style.display = (wrapper.id === `wrapper${company}`) ? "block" : "none";
    });
}

/**
 * 메인 선택 화면으로 전환하는 제어 함수
 */
function showSelectionView() {
    clearHighlights();

    DOM.companySelect.value = "";
    DOM.detailView.style.display = "none";
    DOM.selectionView.style.display = "block";
    DOM.resultCard.style.display = "none";
    DOM.resultBody.innerHTML = "이름과 생년월일을 입력해주세요.";
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
 * 훈련병 검색 로직 및 포커싱 스크롤
 */
function searchPerson() {
    const company = DOM.companySelect.value;
    const name    = DOM.nameInput.value.trim();
    const birth   = DOM.birthInput.value.trim();

    if (!name || !birth) {
        showError("이름과 생년월일을 모두 입력해 주세요.");
        return;
    }

    clearHighlights();

    const found = data.soldiers.find(s => {
        const companyMatch = !company || s.company === company;
        return companyMatch && s.name === name && s.birth === birth;
    });

    DOM.resultCard.style.display = "block";

    if (!found) {
        DOM.resultBody.innerHTML = `
        <div class="no-result">
            <div class="no-result-title">일치하는 정보가 없습니다.</div>
            <div class="no-result-desc">
                중대를 모르시는 경우에는 메인 화면으로 돌아가<br>
                <strong>중대 선택 없이 이름과 생년월일만</strong> 입력 후 다시 조회해 보세요.
            </div>
        </div>
        `;
        return;
    }

    DOM.resultBody.innerHTML = `
    <div class="result-details theme-${found.company}">
        <div class="result-name">${found.name}</div>
        <div class="result-meta">${found.company}중대 · 교번 ${found.number}</div>
        <div class="result-location">📍 위치 : ${found.position}</div>
    </div>
    `;

    showCompany(found.company);

    const seat = document.querySelector(
        `.seat[data-company="${found.company}"][data-position="${found.position}"]`
    );

    if (seat) {
        seat.classList.add("selected-seat");
        setTimeout(() => {
            seat.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 150);
    }
}

/**
 * 에러 메시지 팝업 출력
 */
function showError(msg) {
    DOM.resultCard.style.display = "block";
    DOM.resultBody.innerHTML = `
    <div class="error-msg">
        ⚠️ ${msg}
    </div>`;
}
