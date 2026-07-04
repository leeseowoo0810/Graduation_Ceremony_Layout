async function searchPerson() {

    const company =
        document.getElementById("company").value;

    const name =
        document.getElementById("nameInput").value.trim();

    const phone =
        document.getElementById("phoneInput").value.trim();

    const result =
        document.getElementById("result");

    if (!name || !phone) {

        result.innerHTML =
            "<p>이름과 전화번호를 입력해주세요.</p>";

        return;
    }

    try {

        const response =
            await fetch("./data.json");

        const soldiers =
            await response.json();

        const found =
            soldiers.find(x => {

                const nameMatch =
                    x.name === name;

                const phoneMatch =
                    x.phone === phone;

                const companyMatch =
                    !company || x.company === company;

                return (
                    nameMatch &&
                    phoneMatch &&
                    companyMatch
                );
            });

        if (found) {

            result.innerHTML = `
                <h3>검색 결과</h3>

                <p><strong>중대</strong> : ${found.company}중대</p>
                <p><strong>교번</strong> : ${found.number}</p>
                <p><strong>이름</strong> : ${found.name}</p>
                <p><strong>전화번호</strong> : ${found.phone}</p>
                <p><strong>수료식 위치</strong> : ${found.position}</p>
            `;

        } else {

            result.innerHTML =
                "<p>일치하는 훈련병 정보를 찾을 수 없습니다.</p>";
        }

    } catch(error) {

        console.error(error);

        result.innerHTML =
            "<p>data.json 파일을 불러오지 못했습니다.</p>";
    }
}