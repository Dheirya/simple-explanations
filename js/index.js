const apiKey = 'AIzaSyBmP157wx7RmjRmFhkhaKfBnoVU6D67Spo';
const maxResults = 25;
function getRandomNonZeroInt() {
    let num = 0;
    while (-2 <= num && num <= 2) {
        num = Math.floor(Math.random() * 21) - 10;
    }
    return num;
}
function makeCarousel(id, element, time) {
    const apiUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${id}&maxResults=${maxResults}&key=${apiKey}`;
    fetch(apiUrl).then(response => response.json())
        .then(data => {
            const videos = data.items;
            for (let i = videos.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [videos[i], videos[j]] = [videos[j], videos[i]];
            }
            const carouselEl = document.getElementById(element);
            videos.forEach(video => {
                if (!video.snippet || !video.snippet.resourceId || !video.snippet.resourceId.videoId || !video.snippet.thumbnails || !video.snippet.thumbnails.medium) {
                    console.warn('Skipping video with missing data:', video);
                    return;
                }
                const videoId = video.snippet.resourceId.videoId;
                const thumbnail = video.snippet.thumbnails.medium.url;
                const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
                const videoElement = document.createElement('img');
                videoElement.className = 'carousel-cell';
                videoElement.onclick = () => {
                    window.open(videoLink, '_blank');
                };
                videoElement.setAttribute('data-flickity-lazyload', thumbnail);
                carouselEl.appendChild(videoElement);
            });
            flickIT(element, time);
            const carouselCells = document.querySelectorAll('.carousel-cell');
            carouselCells.forEach(cell => {
                cell.addEventListener('mouseover', () => {
                    if (cell.style.transform.indexOf('scale(1.06)') === -1) {
                        cell.style.transform += ' scale(1.06)';
                    }
                    if (cell.style.transform.indexOf('rotate(') === -1) {
                        cell.style.transform += ' rotate(' + getRandomNonZeroInt() + 'deg)';
                    }
                });
                cell.addEventListener('mouseout', () => {
                    cell.style.transform = cell.style.transform.replace('scale(1.06)', '').replace(/rotate\([-+]?\d+deg\)/, '').trim();
                });
            });
        })
        .catch(error => console.error('Error fetching YouTube data:', error));
}
makeCarousel('PLwG4ajavaJ9KSrTa6czhS00Kz7DtNUdAI', 'carousel-1', 7000);
makeCarousel('PLwG4ajavaJ9JYGO108KOpAvCPLozgPGYY', 'carousel-2', 11000);
makeCarousel('PLwG4ajavaJ9IU7fU7LiHL7Ycup1KKAen6', 'carousel-3', 19000);
makeCarousel('PLwG4ajavaJ9K68cpStVsCS6OCUEf9Mg3i', 'carousel-4', 23000);
function flickIT(element, time) {
    let flkty = new Flickity('#' + element, {
        cellAlign: 'left',
        contain: true,
        pageDots: false,
        lazyLoad: 3,
        wrapAround: true,
        autoPlay: time
    });
}
let canvas = document.getElementById('hero-image');
let width = window.innerWidth;
let height = window.innerHeight;
let margin = 75;
canvas.width = width;
canvas.height = height;
const rc = rough.canvas(canvas);
rc.line(margin, height - margin, width - (margin * 0.5), height - margin, {strokeWidth: 2, stroke: '#264653'});
rc.line(margin, height - margin, margin, margin, {strokeWidth: 2, stroke: '#264653'});
rc.line(width - (margin * 0.5), height - margin, width - margin, height - (margin * 1.5), {strokeWidth: 2, stroke: '#264653'});
rc.line(width - (margin * 0.5), height - margin, width - margin, height - (margin * 0.5), {strokeWidth: 2, stroke: '#264653'});
function generateExponentialPoints(startX, endX, startY, endY, numPoints = 100) {
    const points = [];
    const expBase = 4;
    const maxExp = Math.exp(expBase) - 1;
    for (let i = 0; i < numPoints; i++) {
        const t = i / (numPoints - 1);
        const rawExp = Math.exp(expBase * t) - 1;
        const yNorm = rawExp / maxExp;
        const x = startX + t * (endX - startX);
        const y = startY - yNorm * (startY - endY);
        points.push([x, y]);
    }
    return points;
}
const curvePoints = generateExponentialPoints(margin, width - margin, height - margin, margin, 30);
const shadedPoints = [...curvePoints];
shadedPoints.push([width - margin, height - margin]);
shadedPoints.push([margin, height - margin]);
function animateCurve(points, index = 1) {
    if (index >= points.length) {
        rc.line(width - margin, margin, width - (1.75 * margin), margin + (0.5 * margin), {strokeWidth: 3, stroke: '#d2b05f'});
        rc.line(width - margin, margin, width - (0.8 * margin), margin + (0.75 * margin), {strokeWidth: 3, stroke: '#d2b05f'});
        setTimeout(() => {
            changeWord();
        }, 2000);
        return;
    }
    if (index + 5 === points.length) {
        document.getElementById('hero-text').classList.add('change');
    }
    rc.curve(points.slice(0, index + 1), {strokeWidth: 3, stroke: '#d2b05f'});
    if (index > 1) {
        const prev = points[index - 1];
        const curr = points[index];
        const baseY = height - margin;
        const segment = [prev, curr, [curr[0], baseY], [prev[0], baseY]];
        rc.polygon(segment, {fill: 'rgba(42, 157, 143, 0.3)', fillStyle: 'zigzag-line', fillWeight: 1.5, hachureGap: 4, curveFitting: 1, stroke: 'none'});
    }
    setTimeout(() => {
        animateCurve(points, index + 1);
    }, 50);
}
function reDrawScene() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').clearRect(0, 0, width, height);
    rc.line(margin, height - margin, width - (margin * 0.5), height - margin, {strokeWidth: 2, stroke: '#264653'});
    rc.line(margin, height - margin, margin, margin, {strokeWidth: 2, stroke: '#264653'});
    rc.line(width - (margin * 0.5), height - margin, width - margin, height - (margin * 1.5), {strokeWidth: 2, stroke: '#264653'});
    rc.line(width - (margin * 0.5), height - margin, width - margin, height - (margin * 0.5), {strokeWidth: 2, stroke: '#264653'});
    const newCurvePoints = generateExponentialPoints(margin, width - margin, height - margin, margin, 30);
    const newShadedPoints = [...newCurvePoints];
    newShadedPoints.push([width - margin, height - margin]);
    newShadedPoints.push([margin, height - margin]);
    rc.curve(newCurvePoints, {strokeWidth: 3, stroke: '#d2b05f'});
    rc.line(width - margin, margin, width - (1.75 * margin), margin + (0.5 * margin), {strokeWidth: 3, stroke: '#d2b05f'});
    rc.line(width - margin, margin, width - (0.8 * margin), margin + (0.75 * margin), {strokeWidth: 3, stroke: '#d2b05f'});
    rc.polygon(newShadedPoints, {fill: 'rgba(42, 157, 143, 0.3)', fillStyle: 'zigzag-line', fillWeight: 1.5, hachureGap: 4, curveFitting: 1, stroke: 'none'});
}
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        reDrawScene();
    }, 100);
});
const words = ['impossible', 'overwhelming', 'boring', 'confusing', 'scary', 'difficult'];
let current = 1;
function typeWord(word) {
    document.getElementById('switch-text').textContent = '';
    let i = 0;
    function type() {
        if (i < word.length) {
            document.getElementById('switch-text').textContent += word[i++];
            setTimeout(type, 120);
        } else {
            if (!document.getElementById('hero-scroll').classList.contains('fade-in')) {
                setTimeout(() => {
                    document.getElementById('hero-scroll').classList.add('fade-in');
                }, 1250);
            }
            setTimeout(() => {
                changeWord();
            }, 5000);
        }
    }
    type();
}
function backspaceWord(callback) {
    let text = document.getElementById('switch-text').textContent;
    function erase() {
        if (text.length > 0) {
            text = text.slice(0, -1);
            document.getElementById('switch-text').textContent = text;
            setTimeout(erase, 100);
        } else if (callback) {
            callback();
        }
    }
    erase();
}
function changeWord() {
    backspaceWord(() => {
        current = (current + 1) % words.length;
        typeWord(words[current]);
    });
}
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function(){
        animateCurve(curvePoints);
    }, 250);
});