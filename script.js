let data = null;

window.addEventListener(
    "load",
    async () => {

        const response =
            await fetch("./data.json");

        data =
            await response.json();

        createLayouts();
    }
);

function createLayouts(){

    const layouts =
        data.layout;

    for(const company in layouts){

        const columns =
            layouts[company].columns;

        const lines =
            layouts[company].lines;

        const companyBox =
            document.getElementById(
                "company" + company
            );

        companyBox.style.gridTemplateColumns =
            `repeat(${columns},1fr)`;

        for(let line = 1; line <= lines; line++){

            for(let column = 1; column <= columns; column++){

                const seat =
                    document.createElement("div");

                seat.className = "seat";

                seat.dataset.company =
                    company;

                seat.dataset.position =
                    `${column}-${line}`;

                seat.textContent =
                    `${column}-${line}`;

                companyBox.appendChild(seat);
            }
        }
    }
}

// 검색 버튼
document
.getElementById("searchBtn")
.addEventListener(
    "click",
    searchPerson
);

// 엔터 검색
document
.addEventListener(
    "keydown",
    e => {

        if(e.key === "Enter"){

            searchPerson();
        }
    }
);

// 중대 선택 시 하이라이트
document
.getElementById("company")
.addEventListener(
    "change",
    function(){

        document
        .querySelectorAll(".company-wrapper")
        .forEach(x =>
            x.classList.remove(
                "active-company"
            )
        );

        if(!this.value){
            return;
        }

        const target =
            document.getElementById(
                "wrapper" + this.value
            );

        if(target){

            target.classList.add(
                "active-company"
            );

            target.scrollIntoView({
                behavior:"smooth",
                block:"center"
            });
        }
    }
);

function clearHighlights(){

    document
    .querySelectorAll(".seat")
    .forEach(x =>
        x.classList.remove(
            "selected-seat"
        )
    );

    document
    .querySelectorAll(".company-wrapper")
    .forEach(x =>
        x.classList.remove(
            "active-company"
        )
    );
}

function searchPerson(){

    const company =
        document
        .getElementById("company")
        .value;

    const name =
        document
        .getElementById("nameInput")
        .value
        .trim();

    const phone =
        document
        .getElementById("phoneInput")
        .value
        .trim();

    const result =
        document.querySelector(
            ".result-body"
        );

    clearHighlights();

    const found =
        data.soldiers.find(x => {

            const companyMatch =
                !company ||
                x.company === company;

            return (
                companyMatch &&
                x.name === name &&
                x.phone === phone
            );
        });

    if(!found){

        result.innerHTML =
            "일치하는 정보가 없습니다.";

        return;
    }

    // 중대 자동 선택
    document
    .getElementById("company")
    .value =
    found.company;

    // 중대 강조
    const wrapper =
        document.getElementById(
            "wrapper" + found.company
        );

    if(wrapper){

        wrapper.classList.add(
            "active-company"
        );

        wrapper.scrollIntoView({
            behavior:"smooth",
            block:"center"
        });
    }

    // 좌석 강조
    const seat =
        document.querySelector(
            `[data-company="${found.company}"][data-position="${found.position}"]`
        );

    if(seat){

        seat.classList.add(
            "selected-seat"
        );

        seat.scrollIntoView({
            behavior:"smooth",
            block:"center"
        });
    }

    result.innerHTML =
    `
    <div style="font-size:24px;font-weight:700;">
        ${found.name}
    </div>

    <div>
        ${found.company}중대 · 교번 ${found.number}
    </div>

    <div>
        📍 위치 : ${found.position}
    </div>
    `;
}
