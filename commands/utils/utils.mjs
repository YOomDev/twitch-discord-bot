import fs from "node:fs";

export async function sleep(seconds) { return new Promise(resolve => setTimeout(resolve, Math.max(seconds, 0) * 1000)); }

export function concat(list, separator = "", prefix = "", start = 0, count = list.length) {
    const end = Math.min(start + count, list.length);
    let result = "";
    for (let i = start; i < end; i++) { result += (i <= start ? "" : separator) + prefix + list[i]; }
    return result;
}

export function getTimeDifference(milliFrom, milliTo = new Date().getTime(), showMinutes = false) {
    const totalMinutes = Math.floor((milliTo - milliFrom) / 1000 / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const totalDays = Math.floor(totalHours / 24);
    const years = Math.floor(totalDays / 365);
    const days = totalDays - (years * 365);
    const hours = totalHours - (totalDays * 24);
    const minutes = totalMinutes - (totalHours * 60);
    return `${years > 0 ? `${years} years and ` : ``}${days > 0 ? `${days} days and ` : ``}${hours} hours${(showMinutes && minutes > 0) ? ` and ${minutes} minutes` : ``}`;
}

export function loadJSON(path) { return JSON.parse(fs.readFileSync(new URL(path, import.meta.url))); }
export function saveJSON(path, data) { fs.writeFileSync(new URL(path, import.meta.url), JSON.stringify(data, null, 2)); }

export default {}