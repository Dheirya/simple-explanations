let backendURL = "https://simplexp.koyeb.app";
async function widthChange() {
    if (window.innerWidth < 1000) {
        const mainContent = document.getElementById("main-content");
        const box1 = document.getElementById("box-1");
        const box2 = document.getElementById("box-2");
        box1.style.marginBottom = "20px";
        box2.style.marginBottom = "0px";
        mainContent.insertBefore(box2, box1);
    } else {
        const mainContent = document.getElementById("main-content");
        const box1 = document.getElementById("box-1");
        const box2 = document.getElementById("box-2");
        box1.style.marginBottom = "21.5px";
        box2.style.marginBottom = "20px";
        mainContent.insertBefore(box1, box2);
    }
}
widthChange();
window.addEventListener('resize', widthChange);
async function isServerOn() {
    try {
        const response = await fetch(backendURL + '/ping', { method: 'GET' });
        return response.ok;
    } catch (error) {
        return false;
    }
}
function celebrateConfetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let duration = 3000;
    let animationEnd = Date.now() + duration;
    let defaults = {startVelocity: 30, spread: 360, ticks: 60, zIndex: 0};
    function randomInRange(min, max) {return Math.random() * (max - min) + min;}
    let interval = setInterval(function () {
        let timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {return clearInterval(interval);}
        let particleCount = 500 * (timeLeft / duration);
        confetti({...defaults, particleCount, origin: {x: randomInRange(0.1, 0.3), y: Math.random() - 0.2}});
        confetti({...defaults, particleCount, origin: {x: randomInRange(0.7, 0.9), y: Math.random() - 0.2}});
    }, 250);
}
function sanitize(text) {return text.replace(/[^A-Za-z0-9 _.,!?;:'"()&+\-/@]/g, " ");}
const messagesDict = [{title: "Got Notes?", oneliner: "Sharing is caring!"}, {title: "Be a Study Hero", oneliner: "Your notes could save someone’s grade."}, {title: "Pass It On", oneliner: "If they helped you, they’ll help someone else."}, {title: "Upload & Empower", oneliner: "Your PDF can make the difference."}, {title: "Only a Click", oneliner: "One click can help hundreds of students."}, {title: "Study It Forward", oneliner: "Your notes, their success."}, {title: "Drop Some Notes", oneliner: "Quick upload, big impact."}, {title: "Help Others Learn", oneliner: "Every file supports a learner."}, {title: "Boost Community", oneliner: "Make studying easier for everyone."}, {title: "Leave a Legacy", oneliner: "Notes today, impact tomorrow."}, {title: "Good Notes Matter", oneliner: "Don’t let great notes go unused."}, {title: "Be That Student", oneliner: "The one who actually shares notes."}, {title: "Share Smarter", oneliner: "Upload notes. Help someone succeed."}, {title: "PDFs Under 10MB", oneliner: "Fast upload. Instant value."}, {title: "Help Someone Pass", oneliner: "Your guide might be their game-changer."}];
const message = messagesDict[Math.floor(Math.random() * messagesDict.length)];
document.querySelector("#box-2 h1").innerText = message.title;
document.querySelector("#box-2 p").innerHTML = message.oneliner + " Help others out by uploading <b>your study guides, review sheets, notes, or cheatsheets</b> as PDFs (under 10MB) to help others learn better. Don’t let great notes go to waste—share them!";
let formData = new FormData();
document.getElementById('file-upload').addEventListener('change', function() {
    const file = this.files[0];
    if (file.size > 10 * 1024 * 1024) {
        alert("File size exceeds 10MB limit. Please choose a smaller file");
        this.value = "";
    } else if (file.type !== "application/pdf") {
        alert("Please upload a valid PDF file.");
        this.value = "";
    } else {
        formData.append("file", file);
        document.querySelector("#box-2 h1").innerHTML = "Provide Details";
        document.querySelector("#box-2 p").innerHTML = "You selected: <b>" + file.name + "</b> (" + (file.size / 1024).toFixed(2) + " KB)";
        document.getElementById("upload_step1").remove();
        document.getElementById("upload_step2").style.display = "block";
    }
});
const titleInput = document.getElementById("note-title");
const authorInput = document.getElementById("note-author");
const descriptionInput = document.getElementById("note-description");
const categorySelect = document.getElementById("note-category");
const submitBtn = document.querySelector("#upload_step2");
let inputDone = false;
let recaptcha = false;
[titleInput, authorInput, descriptionInput, categorySelect].forEach(input => {
    input.addEventListener("input", () => {
        inputDone = (titleInput.value && authorInput.value && descriptionInput.value && categorySelect.value);
        submitBtn.querySelector('input[type="submit"]').disabled = !(inputDone && recaptcha);
    });
});
function recaptchaCallback() {
    recaptcha = true;
    if (inputDone) {
        submitBtn.querySelector('input[type="submit"]').disabled = false;
    }
}
async function validateForm() {
    const title = sanitize(titleInput.value.trim());
    const author = sanitize(authorInput.value.trim());
    const description = sanitize(descriptionInput.value.trim());
    const categoryId = categorySelect.value;
    if (!title || !author || !description || !categoryId) {alert("Please fill out all fields."); return;}
    if (title.length > 100) {alert("Title exceeds 100 character limit."); return;}
    if (author.length > 70) {alert("Author name exceeds 70 character limit."); return;}
    if (description.length > 280) {alert("Description exceeds 280 character limit."); return;}
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {alert("Please complete the reCAPTCHA."); return;}
    formData.append("title", title);
    formData.append("author", author);
    formData.append("description", description);
    formData.append("category_id", categoryId);
    formData.append('recaptcha_response', recaptchaResponse);
    await submitForm();
}
async function submitForm() {
    try {
        document.getElementById("upload_step2").remove();
        document.querySelector("#box-2 h1").innerHTML = "Uploading...";
        document.querySelector("#box-2 p").innerHTML = "Please stay on this page while we upload your notes. This may take a moment.";
        const csrfToken = await getCsrfToken();
        const response = await fetch(backendURL + "/sheets/", {method: "POST", body: formData, headers: {"X-CSRF-Token": csrfToken, "Origin": window.location.origin}, credentials: "include"});
        const result = await response.json();
        if (response.ok) {
            document.querySelector("#box-2 h1").innerHTML = "Upload Successful!";
            document.querySelector("#box-2 p").innerHTML = `Thank you, ${result.author}! Your note sheet titled "${result.title}" has been uploaded successfully. We appreciate your contribution, and <b>after verifying the content</b>, we will make it available on our site. If you have any questions about the verification process, feel free to <a href="contact.html">contact us</a>.`;
            celebrateConfetti();
        } else {
            console.log("Error response:", result.detail || result.error);
            document.querySelector("#box-2 h1").innerHTML = "Upload Failed";
            document.querySelector("#box-2 p").innerHTML = `Sorry, there was an issue uploading your notes: <b>${result.detail || result.error}</b> Please try again or <a href="contact.html">contact us</a> if the problem persists.`;
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        document.querySelector("#box-2 h1").innerHTML = "An Error Occurred";
        document.querySelector("#box-2 p").innerHTML = "Sorry, an unexpected error occurred during the upload. Please try again or <a href=\"contact.html\">contact us</a> if the problem persists.";
    }
}
async function getCsrfToken() {
    const res = await fetch(backendURL + "/csrf", {method: "GET", credentials: "include"});
    const data = await res.json();
    return data.csrf_token;
}
async function fetchData(path) {
    let res;
    if (path.startsWith("pdf/")) {
        const csrfToken = await getCsrfToken();
        res = await fetch(`${backendURL}/${path}`, {method: "GET", headers: {"X-CSRF-Token": csrfToken, "Origin": window.location.origin}, credentials: "include"});
    } else {
        res = await fetch(`${backendURL}/${path}`, {method: "GET", headers: {"Origin": window.location.origin}, credentials: "include"});
    }
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to fetch category");
    }
    return await res.json();
}
const state1 = document.getElementById("state1");
const state2 = document.getElementById("state2");
const state3 = document.getElementById("state3");
const topstate1 = document.getElementById("state-top-1");
const topstate2 = document.getElementById("state-top-2");
const topstate3 = document.getElementById("state-top-3");
const loading = document.getElementById("loading-grid");
let categoryState = "All Categories";
let extraCategories = 0;
const url = new URL(window.location.href);
let tagParam = url.searchParams;
isServerOn().then(isServerOn => {
    if (!isServerOn) {
        document.getElementById("upload_step1").style.display = "none";
        document.querySelector("#noteBarText").innerHTML = `<h1>Error 500 Server Failure</h1>`;
        document.getElementById("loading-grid").innerHTML = "<b>The backend API server is not running.</b> Please try again later!";
        topstate1.style.display = "none";
    } else {
        if (tagParam.has("category")) {
            openCategory(tagParam.get("category"));
        } else if (tagParam.has("pdf")) {
            openPDF(tagParam.get("pdf"));
        } else {
            genMainGrid();
        }
    }
});
async function share(shareText) {
    if (navigator.share) {
        await navigator.share({title: document.title, text: shareText, url: window.location.href});
    } else {
        prompt("Copy this link to share:", window.location.href);
    }
}
async function report(pdfId) {
    window.open(`contact.html?report_pdf=${pdfId}`, "_blank");
}
async function genMainGrid() {
    tagParam = new URLSearchParams(window.location.search);
    document.querySelector("#noteBarText").innerHTML = `<h1>Community Notes</h1>`;
    fetchData("all_categories/").then(data => {
        loading.style.display = "none";
        let tagsDict = {};
        data.forEach(category => {
            const option = document.createElement("option");
            option.value = category.id;
            option.textContent = category.name;
            document.getElementById("note-category").appendChild(option);
            if (category.sheet_count === 0) {
                extraCategories++;
                return;
            }
            category.tags.forEach(tag => {
                if (!tagsDict[tag.name]) {
                    tagsDict[tag.name] = [];
                }
                tagsDict[tag.name].push(category.id);
            });
            const box = document.createElement("div");
            box.className = "box";
            box.innerHTML = `<span id="${category.id}" class="textBox"><h2>${category.name}</h2><i>${category.sheet_count} Note Sheets</i></span><span class="material-icons folder">folder_shared</span>`;
            box.onclick = () => openCategory(category.id);
            state1.appendChild(box);
        });
        const sortedTags = Object.keys(tagsDict).sort((a, b) => tagsDict[b].length - tagsDict[a].length);
        const select = document.querySelector(".noteRight");
        sortedTags.forEach(tag => {
            const option = document.createElement("option");
            option.value = tag;
            option.textContent = tag;
            select.appendChild(option);
        });
        if (tagParam.has("tag")) {
            document.querySelector('.noteRight').value = tagParam.get("tag");
            document.querySelector('.noteRight').dispatchEvent(new Event('change'));
        } else {
            if (extraCategories > 0) {
                const box = document.createElement("div");
                box.className = "box";
                box.id = "extraCategoriesBox";
                box.innerHTML = `<span class="textBox"><h2><i>${extraCategories} More Categories...</i></h2><i>With 0 Note Sheets. Be the first!</i></span>`;
                state1.appendChild(box);
            }
        }
    });
}
document.querySelector('.noteRight').addEventListener('change', function() {
    const selectedTag = this.value;
    categoryState = selectedTag;
    if (selectedTag === "All Categories") {
        if (extraCategories > 0 && document.getElementById("extraCategoriesBox") === null) {
            const box = document.createElement("div");
            box.className = "box";
            box.id = "extraCategoriesBox";
            box.innerHTML = `<span class="textBox"><h2><i>${extraCategories} More Categories...</i></h2><i>With 0 Note Sheets</i></span>`;
            state1.appendChild(box);
        } else {
            document.getElementById("extraCategoriesBox").style.display = "none";
        }
        for (const box of state1.children) {
            history.pushState({}, "", "notes.html");
            document.title = "Community Notes on Simple Explanations";
            document.querySelector('meta[name="description"]').setAttribute("content", "Discover and contribute high-quality, student-curated study notes, review guides, and cheatsheets across subjects. Join the Simple Explanations community to enhance your learning and help others succeed.");
            box.style.display = "flex";
        }
    } else {
        (document.getElementById("extraCategoriesBox") || {}).style = {display: "none"};
        for (const box of state1.children) {
            history.pushState({tag: selectedTag}, "", `notes.html?tag=${selectedTag}`);
            document.title = `${selectedTag} Notes on Simple Explanations`;
            document.querySelector('meta[name="description"]').setAttribute("content", `Explore curated ${selectedTag.toLowerCase()} notes, review guides, and cheatsheets created by students on Simple Explanations. A smarter way to study.`);
            if (tagsDict[selectedTag] && tagsDict[selectedTag].includes(parseInt(box.querySelector('.textBox').id))) {
                box.style.display = "flex";
            } else {
                box.style.display = "none";
            }
        }
    }
});
async function changeState(state) {
    if (state === 1) {
        if (state1.innerHTML === "") {
            await genMainGrid();
        }
        state3.style.display = "none";
        state2.style.display = "none";
        state1.style.display = "grid";
        topstate1.style.display = "flex";
        topstate2.style.display = "none";
        topstate3.style.display = "none";
        document.getElementById('pdf-viewer').style.display = "none";
        document.querySelector("#searchNotesInput").value = "";
        document.querySelector("#noteBarText").innerHTML = `<h1>Community Notes</h1>`;
        if (categoryState === "All Categories") {
            history.pushState({}, "", "notes.html");
            document.title = "Community Notes on Simple Explanations";
            document.querySelector('meta[name="description"]').setAttribute("content", "Discover and contribute high-quality, student-curated study notes, review guides, and cheatsheets across subjects. Join the Simple Explanations community to enhance your learning and help others succeed.");
        } else {
            history.pushState({tag: categoryState}, "", `notes.html?tag=${categoryState}`);
            document.title = `${categoryState} Notes on Simple Explanations`;
            document.querySelector('meta[name="description"]').setAttribute("content", `Explore curated ${categoryState} notes, review guides, and cheatsheets created by students on Simple Explanations. A smarter way to study.`);
        }
    }
}
async function searchNotes() {
    const query = document.getElementById("searchNotesInput").value.toLowerCase();
    if (query !== "") {
        history.pushState({search: query}, "", `notes.html?${new URLSearchParams({...Object.fromEntries(new URLSearchParams(location.search)), search: query}).toString()}`);
        document.title = `Search results for "${query}" on Simple Explanations`;
        document.querySelector('meta[name="description"]').setAttribute("content", `Search results for "${query}" across community-submitted notes and review materials. Find what you need fast on Simple Explanations.`);
    } else {
        history.pushState({}, "", `notes.html?${new URLSearchParams(Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k !== "search"))).toString()}`);
        document.title = "Community Notes on Simple Explanations";
        document.querySelector('meta[name="description"]').setAttribute("content", "Discover and contribute high-quality, student-curated study notes, review guides, and cheatsheets across subjects. Join the Simple Explanations community to enhance your learning and help others succeed.");
    }
    for (const box of state2.children) {
        const title = box.querySelector("h2").innerText.toLowerCase();
        const author = box.querySelector("i").innerText.toLowerCase();
        if (title.includes(query) || author.includes(query)) {
            box.style.display = "flex";
        } else {
            box.style.display = "none";
        }
    }
}
let EPDFinstance = null;
async function openPDF(pdfId) {
    tagParam = new URLSearchParams(window.location.search);
    state3.innerHTML = `<div id="pdf-viewer" style="width: 100%;"></div>`;
    loading.style.display = "block";
    state1.style.display = "none";
    state2.style.display = "none";
    state3.style.display = "grid";
    topstate1.style.display = "none";
    topstate2.style.display = "none";
    topstate3.style.display = "flex";
    fetchData("pdf/" + pdfId + "/").then(async data => {
        history.pushState({pdfId: pdfId}, "", `notes.html?pdf=${pdfId}`);
        document.title = `${data.title} Note Sheet on Simple Explanations`;
        document.querySelector('meta[name="description"]').setAttribute("content", `View "${data.title}"—a shared note sheet by ${data.author} in the ${data.category_name} folder on Simple Explanations. Learn efficiently with concise and accurate notes.`);
        document.getElementById("folder3").onclick = () => openCategory(data.category_rel.id);
        document.getElementById("share3").onclick = () => share(`Check out the ${data.title} note sheet on Simple Explanations!`);
        document.getElementById("report3").onclick = () => report(data.id);
        let titleDesc = (s => s.endsWith('.') ? s : s + '.')(data.description);
        document.querySelector("#noteBarText").innerHTML = `<span id="maxWidthSpan"><h1 style="font-size: 28px">${data.title} Sheet</h1><small>${titleDesc} Posted by ${data.author} in ${data.category_name} Folder</i></small></span>`;
        document.getElementById('pdf-viewer').style.display = "block";
        const EmbedPDF = await import('https://snippet.embedpdf.com/embedpdf.js');
        loading.style.display = "none";
        EPDFinstance = EmbedPDF.default.init({type: 'container', target: document.getElementById('pdf-viewer'), src: data.url});
    });
}
async function openCategory(categoryId) {
    tagParam = new URLSearchParams(window.location.search);
    state2.innerHTML = "";
    loading.style.display = "block";
    state1.style.display = "none";
    state2.style.display = "grid";
    state3.style.display = "none";
    topstate1.style.display = "none";
    topstate2.style.display = "flex";
    topstate3.style.display = "none";
    document.getElementById('pdf-viewer').style.display = "none";
    fetchData("category/" + categoryId + "/").then(data => {
        loading.style.display = "none";
        if (!(tagParam.has("category") && tagParam.get("category") === categoryId)) {
            history.pushState({categoryId: categoryId}, "", `notes.html?category=${categoryId}`);
            document.title = `${data[0].name} Notes on Simple Explanations`;
            document.querySelector('meta[name="description"]').setAttribute("content", `Explore ${data[0].name} notes and cheatsheets shared by students. Find all resources in this subject category on Simple Explanations.`);
        }
        document.querySelector("#noteBarText").innerHTML = `<span><h1>${data[0].name} Notes</h1><p>${data[0].description}</p></span>`;
        data[0].sheets.forEach(note => {
            const box = document.createElement("div");
            box.className = "box";
            box.innerHTML = `<span class="textBox"><h2>${note.title}</h2><i>Posted by ${note.author}</i></span><span class="material-icons folder">description</span>`;
            box.onclick = () => openPDF(note.id);
            state2.appendChild(box);
        });
        if (tagParam.has("search")) {
            document.getElementById("searchNotesInput").value = tagParam.get("search");
            searchNotes();
        }
    })
}
