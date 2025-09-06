# JavaScript Runtime & Concurrency Visualizer

An interactive web-based tool designed to visually demonstrate the core concepts of the JavaScript runtime environment.
This project helps in understanding how JavaScript, despite being single-threaded, handles asynchronous operations
efficiently using the Event Loop model.

This tool is perfect for presentations, knowledge-sharing sessions, or personal study to deepen your understanding of "
under-the-hood" JS concepts.

![JavaScript Visualizer Screenshot](https://i.imgur.com/v8tA9bJ.png)
*(نکته: پیشنهاد می‌شود یک GIF کوتاه از عملکرد شبیه‌ساز را جایگزین این تصویر کنید)*

---

## ✨ Features

- **Interactive Visualization:** Watch the flow of functions and callbacks between different components of the JS
  runtime.
- **Dedicated Components:** Separate, color-coded boxes for the **Call Stack**, **Heap**, **Microtask Queue**, and *
  *Macrotask Queue**.
- **Web Worker Simulation:** A dedicated box for the **Worker Thread** to clearly demonstrate true parallelism vs.
  concurrency.
- **Multiple Scenarios:** Includes 6 distinct scenarios to demonstrate:
    1. `setTimeout` (Macrotasks)
    2. `Promise` (Microtasks)
    3. `async/await` (Syntactic Sugar for Promises)
    4. A complex interaction of `await` with Macrotasks and Microtasks.
    5. A priority demo to show Microtasks always execute before Macrotasks.
    6. `Web Workers` for heavy background computations.
- **Animation Control:** Pause and Reset functionality for each simulation.
- **Modern UI:** A clean, tab-based interface built with vanilla HTML, CSS, and JavaScript.

---

## 🚀 How to Run

This project is built with plain web technologies and requires no complex setup.

1. Clone this repository to your local machine.
2. No installation or build step is needed.
3. Simply open the `index.html` file in a modern web browser (like Chrome, Firefox, or Edge).

---

## 📁 Project Files

This repository contains the main application and supplementary files for a presentation:

- **/index.html**: The main interactive visualizer application.
- **/style.css**: All styles for the visualizer's layout, theme, and animations.
- **/script.js**: The core logic for all simulations, animations, and UI interactions.
- **/worker.js**: The script that runs on a separate thread for the Web Worker scenario.
- **/presentation_outline.html**: A complete presentation script with detailed explanations for all topics **in Persian
  **.
- **/presentation_titles.html**: A presentation outline with all titles and code examples **in English**.

---

## 🧠 Concepts Covered

This project is designed to help you understand and teach the following concepts:

- **JavaScript Engine (V8):** The role of the engine.
- **Memory Management:**
    - The **Call Stack** and its LIFO (Last-In, First-Out) nature.
    - The **Memory Heap** for storing objects and functions.
    - The concept of Garbage Collection (not visualized but explained in the outline).
- **The Event Loop:** The core of the concurrency model.
- **Task Queues:**
    - **Macrotask Queue** (or Callback Queue).
    - **Microtask Queue** and its higher priority.
- **Asynchronous JavaScript:**
    - `setTimeout`
    - Promises (`.then`, `.catch`)
    - `async/await`
- **Web APIs:** The role of the browser in providing async capabilities.
- **Parallelism:**
    - **Web Workers** and how they run on separate threads.

---

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

## توضیحات فارسی

### شبیه‌ساز بصری محیط اجرایی و همروندی در جاوا اسکریپت

این پروژه یک ابزار تعاملی تحت وب است که برای نمایش بصری مفاهیم هسته‌ای محیط اجرایی جاوا اسکریپت طراحی شده است. هدف این
ابزار، کمک به درک این موضوع است که جاوا اسکریپت چگونه با وجود تک‌رشته‌ای بودن، عملیات غیرهمزمان را به کمک مدل Event Loop
به طور موثر مدیریت می‌کند.

این ابزار برای ارائه‌ها، جلسات اشتراک دانش و مطالعه شخصی برای درک عمیق مفاهیم "پشت صحنه" جاوا اسکریپت ایده‌آل است.

#### فایل‌های پروژه

* `index.html`: اپلیکیشن اصلی و تعاملی شبیه‌ساز.
* `style.css`: تمام استایل‌های مربوط به چیدمان، تم و انیمیشن‌ها.
* `script.js`: منطق اصلی تمام شبیه‌سازی‌ها، انیمیشن‌ها و تعاملات کاربری.
* `worker.js`: اسکریپت مربوط به سناریوی Web Worker که در رشته‌ای مجزا اجرا می‌شود.
* `presentation_outline.html`: یک اسکریپت کامل ارائه با توضیحات جامع و عمیق به **زبان فارسی**.
* `presentation_titles.html`: یک رئوس مطالب برای ارائه با تمام عناوین و مثال‌های کد به **زبان انگلیسی**.