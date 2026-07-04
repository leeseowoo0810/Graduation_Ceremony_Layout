let data = null;

window.addEventListener("load", async () => {

    const response = await fetch("./data.json");

    data = await response.json();

    createLayouts();

});

function createLayouts(){

    const layouts = data.layout;

    for(const company in layouts){

        const columns = layouts[company].columns;
        const lines = layouts[company].lines;

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

                seat.dataset.company = company;

                seat.dataset.position =
                    `${column}-${line}`;

                seat.textContent =
                    `${column}-${line}`;

                companyBox.appendChild(seat);

            }

        }

    }

}

document
    .getElementById("searchBtn")
    .addEventListener("click", searchPerson);

document
    .getElementById("company")
    .addEventListener("change", function(){

        document
            .querySelectorAll(".company-wrapper")
            .forEach(x =>
                x.classList.remove("active-company")
            );

        if(this.value){

            document
                .getElementById(
                    "wrapper" + this.value
                )
                .classList.add("active-company");
        }

    });

document.addEventListener("keydown", e => {

    if(e.key === "Enter"){
        searchPerson();
    }

});

function searchPerson(){

    const company =
        document.getElementById("company").value;

    const name =
        document.getElementById("nameInput")
        .value.trim();

    const phone =
        document.getElementById("phoneInput")
        .value.trim();

    const resultBody =
        document.querySelector(".result-body");

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

    document
        .querySelectorAll(".seat")
        .forEach(x =>
            x.classList.remove("selected-seat")
        );

    document
        .querySelectorAll(".company-wrapper")
        .forEach(x =>
            x.classList.remove("active-company")
        );

    if(!found){

        resultBody.innerHTML =
            "일치하는 훈련병 정보를 찾을 수 없습니다.";

        return;
    }

    document.getElementById("company").value =
        found.company;

    document
        .getElementById(
            "wrapper" + found.company
        )
        .classList.add("active-company");

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

    resultBody.innerHTML = `
        <strong>${found.name}</strong><br>
        ${found.company}중대 · 교번 ${found.number}<br>
        📍 위치 : ${found.position}
    `;
}
