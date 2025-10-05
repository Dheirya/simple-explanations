let params = new URLSearchParams(window.location.search);
let backendURL = "https://simplexp.koyeb.app";
if (params.has('report_pdf')) {
    let report_pdf = params.get('report_pdf');
    document.getElementById("contact-message").value = `I wanted to report that the PDF for the following video is broken, missing, incorrect or something else: PDF #${report_pdf}\n\nExplanation (please describe the issue in detail): `;
    document.getElementById("contact-message").focus();
}
function errorMessage(message) {
    document.getElementById("textMessage").innerHTML = message;
    document.getElementById("textMessage").style.color = "red";
    document.getElementById("contact").style.display = "none";
}
function isRateLimited() {
    const now = Date.now();
    let data = localStorage.getItem("contact_limit_data");
    if (data) {
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = null;
        }
    }
    if (!data || now - data.timestamp > 24 * 60 * 60 * 1000) {
        localStorage.setItem("contact_limit_data", JSON.stringify({timestamp: now, count: 1}));
        return false;
    }
    if (data.count < 3) {
        data.count += 1;
        localStorage.setItem("contact_limit_data", JSON.stringify(data));
        return false;
    }
    return true;
}
async function isServerOn() {
    try {
        const response = await fetch(backendURL + '/ping', {method: 'GET'});
        return response.ok;
    } catch (error) {
        return false;
    }
}
async function getCsrfToken() {
    const res = await fetch(backendURL + "/csrf", {
        method: "GET",
        credentials: "include"
    });
    console.log("Response headers:", res.headers);
    console.log("Document cookies after CSRF call:", document.cookie);
    const data = await res.json();
    return data.csrf_token;
}
async function emailReq(recaptchaResponse) {
    const formData = new FormData();
    formData.append("email", document.getElementById('contact-email').value);
    formData.append("message", document.getElementById('contact-message').value);
    formData.append('recaptcha_response', recaptchaResponse);
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch(backendURL + "/contact/", {method: "POST", body: formData, headers: {"X-CSRF-Token": csrfToken, "Origin": "http://localhost:63342"}, credentials: "include"});
        const result = await response.json();
        if (response.ok) {
            return "Success";
        } else {
            console.log(result);
            return result.detail || result.error;
        }
    } catch (error) {console.log(error); return error.error || error.detail;}
}
async function sendMail(event) {
    event.preventDefault();
    const recaptchaResponse = grecaptcha.getResponse();
    if (!recaptchaResponse) {
        alert('Please complete the reCAPTCHA challenge.');
        document.getElementById('contact-submit').style.display = 'inline-block';
        document.getElementById('contact-email').disabled = false;
        document.getElementById('contact-message').disabled = false;
        return;
    }
    let serverIsUp = await isServerOn();
    if (serverIsUp) {
        document.getElementById('contact-submit').style.display = 'none';
        document.getElementById('contact-email').disabled = true;
        document.getElementById('contact-message').disabled = true;
        document.getElementById('textMessage').innerHTML = "<b>Please be patient.</b> We are sending your message...";
        const email = document.getElementById('contact-email').value;
        const message = document.getElementById('contact-message').value;
        const honeypot = document.getElementById('contact-name').value;
        if (email && message && honeypot === "") {
            if (isRateLimited()) {
                errorMessage("<b>Rate limit exceeded: 3 per 1 day.</b><br/><br/>The more technical error is printed in the console");
                return;
            }
            const result = await emailReq(recaptchaResponse);
            document.getElementById('contact').style.display = 'none';
            if (result === "Success") {
                document.getElementById('textMessage').innerHTML = "<b>Your message has been sent successfully!</b>";
                document.getElementById('textMessage').style.color = "green";
            } else {
                errorMessage(`<b>${result}</b>.<br/><br/>The more technical error is printed in the console`);
            }
        } else {
            alert('Please fill in all the fields.');
        }
    } else {
        errorMessage("The backend API server is not running.<br/><br/><b>Please try again later!</b>");
    }
}