#pragma once
#include <cstdint>
#include <cstddef>
#include <cstring>
namespace fh6 {
constexpr uint32_t width = 1024, height = 512, stride = width * 4;
constexpr size_t pixels_size = size_t(stride) * height, header_size = 24;
constexpr uint8_t marker[] = {17, 83, 29, 211, 61, 137, 43, 193, 101, 7, 157, 71, 229, 113, 47, 181};
inline uint32_t read32(const uint8_t *p) { uint32_t n; std::memcpy(&n, p, 4); return n; }
inline bool valid_frame(const uint8_t *p, size_t size) {
  return size == header_size + pixels_size && std::memcmp(p, "FH6F", 4) == 0 &&
    read32(p + 4) == 1 && read32(p + 8) == width && read32(p + 12) == height && read32(p + 16) == stride;
}
inline bool is_marker(const void *data, size_t row_pitch) {
  if (!data || row_pitch < stride) return false;
  auto p = static_cast<const uint8_t *>(data);
  for (size_t i = 0; i < sizeof(marker); ++i)
    if (p[i*4] != marker[i] || p[i*4+1] != marker[i] || p[i*4+2] != marker[i] || p[i*4+3] != 255) return false;
  return true;
}
}
