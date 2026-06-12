const fs = require('fs');

const step4 = fs.readFileSync('C:/Users/nabee/.gemini/antigravity-ide/brain/53bee656-9e2b-449d-b678-caeb3336cd89/.system_generated/steps/4/content.md', 'utf8');
const step5 = fs.readFileSync('C:/Users/nabee/.gemini/antigravity-ide/brain/53bee656-9e2b-449d-b678-caeb3336cd89/.system_generated/steps/5/content.md', 'utf8');

// The files have line numbers added like "9: Timestamp,..."
function cleanLine(line) {
    const match = line.match(/^\d+:\s(.*)$/);
    return match ? match[1] : line;
}

const lines4 = step4.split('\n').filter(l => l.match(/^\d+:/)).map(cleanLine);
const lines5 = step5.split('\n').filter(l => l.match(/^\d+:/)).map(cleanLine);

// Find the header row
const header4 = lines4.find(l => l.includes('Timestamp') || l.includes('الأسم'));
const header5 = lines5.find(l => l.includes('Timestamp') || l.includes('الأسم'));

const participants = [
    "علي", "محمد عقيل", "عقيل", "ليث اللواتي", "وردة", "فاطمه", 
    "Yaseen", "بسمله", "نبيل", "زينب", "نوفل اللواتي", "زهراء", "حسن", "محمد أنور"
];

// Let's create an empty structure
const data = {
    participants: participants,
    groups: {
        A: ["المكسيك", "جنوب أفريقيا", "كوريا الجنوبية", "التشيك"],
        B: ["كندا", "البوسنة", "قطر", "سويسرا"],
        C: ["البرازيل", "المغرب", "هايتي", "اسكتلندا"],
        D: ["أمريكا", "باراغواي", "أستراليا", "تركيا"],
        E: ["ألمانيا", "كوراساو", "ساحل العاج", "الإكوادور"],
        F: ["هولندا", "اليابان", "السويد", "تونس"],
        G: ["بلجيكا", "مصر", "إيران", "نيوزيلندا"],
        H: ["إسبانيا", "الرأس الأخضر", "السعودية", "أوروغواي"],
        I: ["فرنسا", "السنغال", "العراق", "النرويج"],
        J: ["الأرجنتين", "الجزائر", "النمسا", "الأردن"],
        K: ["البرتغال", "الكونغو", "أوزبكستان", "كولومبيا"],
        L: ["إنجلترا", "كرواتيا", "غانا", "بنما"]
    },
    matchesR1: [
        {id: "R1-1", home: "المكسيك", away: "جنوب أفريقيا", group: "A"},
        {id: "R1-2", home: "كوريا الجنوبية", away: "التشيك", group: "A"},
        {id: "R1-3", home: "كندا", away: "البوسنة", group: "B"},
        {id: "R1-4", home: "أمريكا", away: "باراغواي", group: "D"},
        {id: "R1-5", home: "قطر", away: "سويسرا", group: "B"},
        {id: "R1-6", home: "البرازيل", away: "المغرب", group: "C"},
        {id: "R1-7", home: "هايتي", away: "اسكتلندا", group: "C"},
        {id: "R1-8", home: "أستراليا", away: "تركيا", group: "D"},
        {id: "R1-9", home: "ألمانيا", away: "كوراساو", group: "E"},
        {id: "R1-10", home: "هولندا", away: "اليابان", group: "F"},
        {id: "R1-11", home: "ساحل العاج", away: "الإكوادور", group: "E"},
        {id: "R1-12", home: "السويد", away: "تونس", group: "F"},
        {id: "R1-13", home: "إسبانيا", away: "الرأس الأخضر", group: "H"},
        {id: "R1-14", home: "بلجيكا", away: "مصر", group: "G"},
        {id: "R1-15", home: "السعودية", away: "أوروغواي", group: "H"},
        {id: "R1-16", home: "إيران", away: "نيوزيلندا", group: "G"},
        {id: "R1-17", home: "فرنسا", away: "السنغال", group: "I"},
        {id: "R1-18", home: "العراق", away: "النرويج", group: "I"},
        {id: "R1-19", home: "الأرجنتين", away: "الجزائر", group: "J"},
        {id: "R1-20", home: "النمسا", away: "الأردن", group: "J"},
        {id: "R1-21", home: "البرتغال", away: "الكونغو", group: "K"},
        {id: "R1-22", home: "إنجلترا", away: "كرواتيا", group: "L"},
        {id: "R1-23", home: "غانا", away: "بنما", group: "L"},
        {id: "R1-24", home: "أوزبكستان", away: "كولومبيا", group: "K"}
    ],
    // Let's create an empty object for participant data
    predictions: {}
};

// Initialize predictions object
participants.forEach(p => {
    data.predictions[p] = {
        r1: {},
        qualifiers: {}
    };
});

const output = `const APP_DATA = ${JSON.stringify(data, null, 2)};`;
fs.writeFileSync('C:/Users/nabee/OneDrive/Desktop/Ali Antigravity/data.js', output);
console.log("data.js generated successfully!");
