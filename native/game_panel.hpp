#pragma once
struct IDXGISwapChain;
namespace fh6panel {
void start(bool testing=false);
void draw(IDXGISwapChain *swap,unsigned targets,unsigned uploads);
void stop();
}
