<template>
  <div>
    <div class="fixed bottom-0 left-0 max-w-[30rem] object-contain z-10">
      <div class="relative">
        <!-- 渐变背景 -->
        <div class="absolute inset-0 bg-gradient-to-tr from-blue-500 to-transparent opacity-40 blur-2xl rounded-2xl"></div>
        <!-- 半透明直角线条 -->
        <div class="absolute bottom-0 left-0 w-40 h-40 border-l-4 border-b-4 border-blue-400 opacity-50"></div>
        <!-- 虚线直角 -->
        <div class="absolute bottom-6 left-6 w-36 h-36 border-l-4 border-b-4 border-dashed border-blue-300 opacity-40"></div>
        <!-- 半透明圆形 -->
        <div class="absolute -top-10 -left-10 w-28 h-28 border-4 border-blue-500 rounded-full opacity-50"></div>
        <!-- 大圆形虚线 -->
        <div class="absolute -top-16 -left-16 w-48 h-48 border-4 border-dashed border-blue-300 opacity-30 rounded-full"></div>
        <!-- 渐变线条 -->
        <div class="absolute bottom-12 left-12 w-56 h-1 bg-gradient-to-r from-blue-400 to-transparent opacity-50"></div>
        <!-- 额外的渐变线条 -->
        <div class="absolute bottom-16 left-16 w-64 h-1 bg-gradient-to-r from-blue-300 to-transparent opacity-40"></div>
      </div>
    </div>
    <div class="fixed bottom-0 right-0 z-10">
      <div class="relative">
        <!-- 渐变背景 -->
        <div class="absolute bottom-0 right-0 w-64 h-64 bg-gradient-to-tl from-blue-500 to-transparent opacity-40 blur-2xl rounded-tl-full"></div>
        <!-- 半透明直角线条 -->
        <div class="absolute bottom-0 right-0 w-40 h-40 border-t-4 border-r-4 border-blue-400 opacity-50"></div>
        <!-- 虚线直角 -->
        <div class="absolute bottom-6 right-6 w-36 h-36 border-t-4 border-r-4 border-dashed border-blue-300 opacity-40"></div>
        <!-- 半透明圆形 -->
        <div class="absolute -bottom-10 -right-10 w-28 h-28 border-4 border-blue-500 rounded-full opacity-50"></div>
        <!-- 大圆形虚线 -->
        <div class="absolute -bottom-16 -right-16 w-48 h-48 border-4 border-dashed border-blue-300 opacity-30 rounded-full"></div>
        <!-- 渐变线条 -->
        <div class="absolute bottom-12 right-12 w-56 h-1 bg-gradient-to-l from-blue-400 to-transparent opacity-50"></div>
        <!-- 额外的渐变线条 -->
        <div class="absolute bottom-16 right-16 w-64 h-1 bg-gradient-to-l from-blue-300 to-transparent opacity-40"></div>
      </div>
    </div>
  </div>
</template>