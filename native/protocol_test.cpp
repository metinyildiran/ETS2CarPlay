#include "protocol.hpp"
#include <vector>
#include <cassert>
int main() {
  std::vector<uint8_t> data(fh6::header_size + fh6::pixels_size);
  std::memcpy(data.data(), "FH6F", 4);
  uint32_t fields[] = {1, fh6::width, fh6::height, fh6::stride, 1};
  std::memcpy(data.data() + 4, fields, sizeof(fields));
  assert(fh6::valid_frame(data.data(), data.size()));
  assert(!fh6::valid_frame(data.data(), data.size() - 1));
  data[4] = 2; assert(!fh6::valid_frame(data.data(), data.size()));
  assert(!fh6::is_marker(nullptr, fh6::stride));
  std::vector<uint8_t> row(fh6::stride);
  for (size_t i=0; i<sizeof(fh6::marker); ++i) {
    row[i*4]=row[i*4+1]=row[i*4+2]=fh6::marker[i]; row[i*4+3]=255;
  }
  assert(fh6::is_marker(row.data(), row.size()));
  row[2]++; assert(!fh6::is_marker(row.data(), row.size()));
}
