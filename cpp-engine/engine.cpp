// PankuWire v2 — C++ Speed Engine
// Algorithms: Bloom Filter, Custom HashMap, Merge Sort, Quickselect
// Compile: g++ -O2 -std=c++17 -o engine engine.cpp
// Used via: subprocess from Python or as standalone binary

#include <iostream>
#include <vector>
#include <string>
#include <unordered_map>
#include <algorithm>
#include <cmath>
#include <functional>
#include <sstream>

// ── 1. BLOOM FILTER ─────────────────────────────────────────
// Space-efficient probabilistic deduplication — O(1) insert/lookup
class BloomFilter {
    std::vector<bool> bits;
    size_t size;
    int numHashes;

    // Multiple hash functions using different seeds
    size_t hash1(const std::string& s) const {
        size_t h = 5381;
        for (char c : s) h = ((h << 5) + h) ^ c;
        return h % size;
    }
    size_t hash2(const std::string& s) const {
        size_t h = 52711;
        for (char c : s) h = ((h << 5) + h) ^ c;
        return h % size;
    }
    size_t hash3(const std::string& s) const {
        size_t h = 0;
        for (char c : s) h = h * 31 + c;
        return h % size;
    }

public:
    BloomFilter(size_t sz = 65536, int nh = 3) : size(sz), numHashes(nh) {
        bits.assign(sz, false);
    }

    void add(const std::string& item) {
        bits[hash1(item)] = true;
        bits[hash2(item)] = true;
        bits[hash3(item)] = true;
    }

    bool contains(const std::string& item) const {
        return bits[hash1(item)] && bits[hash2(item)] && bits[hash3(item)];
    }

    void reset() { std::fill(bits.begin(), bits.end(), false); }
};

// ── 2. CUSTOM HASH MAP ───────────────────────────────────────
// Open-addressing hash map for article ID → score mapping
// O(1) average insert/lookup
template<typename K, typename V>
class HashMap {
    static const int CAPACITY = 4096;
    struct Entry { K key; V val; bool occupied = false; };
    Entry table[CAPACITY];

    int hashFn(const std::string& k) const {
        size_t h = 0;
        for (char c : k) h = h * 131 + c;
        return h % CAPACITY;
    }

public:
    void set(const K& key, const V& val) {
        int idx = hashFn(key);
        while (table[idx].occupied && table[idx].key != key)
            idx = (idx + 1) % CAPACITY;
        table[idx] = {key, val, true};
    }

    V get(const K& key, V defaultVal = V{}) const {
        int idx = hashFn(key);
        while (table[idx].occupied) {
            if (table[idx].key == key) return table[idx].val;
            idx = (idx + 1) % CAPACITY;
        }
        return defaultVal;
    }

    bool has(const K& key) const {
        int idx = hashFn(key);
        while (table[idx].occupied) {
            if (table[idx].key == key) return true;
            idx = (idx + 1) % CAPACITY;
        }
        return false;
    }
};

// ── 3. MERGE SORT ────────────────────────────────────────────
// Stable sort for merging pre-sorted RSS feeds — O(n log n)
struct Article {
    std::string id, title, source;
    double score;
    long long timestamp;
};

void merge(std::vector<Article>& arr, int l, int m, int r) {
    std::vector<Article> left(arr.begin() + l, arr.begin() + m + 1);
    std::vector<Article> right(arr.begin() + m + 1, arr.begin() + r + 1);
    int i = 0, j = 0, k = l;
    while (i < (int)left.size() && j < (int)right.size()) {
        // Sort by timestamp descending (newest first)
        if (left[i].timestamp >= right[j].timestamp)
            arr[k++] = left[i++];
        else
            arr[k++] = right[j++];
    }
    while (i < (int)left.size()) arr[k++] = left[i++];
    while (j < (int)right.size()) arr[k++] = right[j++];
}

void mergeSort(std::vector<Article>& arr, int l, int r) {
    if (l >= r) return;
    int m = l + (r - l) / 2;
    mergeSort(arr, l, m);
    mergeSort(arr, m + 1, r);
    merge(arr, l, m, r);
}

// ── 4. QUICKSELECT (Top-K) ───────────────────────────────────
// Find top-K articles by score in O(n) average — faster than full sort
int partitionByScore(std::vector<Article>& arr, int lo, int hi) {
    double pivot = arr[hi].score;
    int i = lo;
    for (int j = lo; j < hi; j++) {
        if (arr[j].score > pivot) {  // descending
            std::swap(arr[i], arr[j]);
            i++;
        }
    }
    std::swap(arr[i], arr[hi]);
    return i;
}

void quickselect(std::vector<Article>& arr, int lo, int hi, int k) {
    if (lo >= hi) return;
    int pivot = partitionByScore(arr, lo, hi);
    if (pivot == k) return;
    else if (pivot < k) quickselect(arr, pivot + 1, hi, k);
    else quickselect(arr, lo, pivot - 1, k);
}

std::vector<Article> topK(std::vector<Article> arr, int k) {
    if ((int)arr.size() <= k) {
        mergeSort(arr, 0, arr.size() - 1);
        return arr;
    }
    quickselect(arr, 0, arr.size() - 1, k);
    auto result = std::vector<Article>(arr.begin(), arr.begin() + k);
    mergeSort(result, 0, result.size() - 1);
    return result;
}

// ── 5. KMP SEARCH ────────────────────────────────────────────
std::vector<int> buildLPS(const std::string& pattern) {
    int m = pattern.size();
    std::vector<int> lps(m, 0);
    int len = 0, i = 1;
    while (i < m) {
        if (pattern[i] == pattern[len]) lps[i++] = ++len;
        else if (len) len = lps[len - 1];
        else lps[i++] = 0;
    }
    return lps;
}

bool kmpSearch(const std::string& text, const std::string& pattern) {
    if (pattern.empty()) return true;
    auto lps = buildLPS(pattern);
    int i = 0, j = 0;
    while (i < (int)text.size()) {
        if (text[i] == pattern[j]) { i++; j++; }
        if (j == (int)pattern.size()) return true;
        else if (i < (int)text.size() && text[i] != pattern[j]) {
            j = j ? lps[j-1] : 0;
            if (!j) i++;
        }
    }
    return false;
}

// ── MAIN: Command-line interface ─────────────────────────────
// Called by Python via subprocess:
// echo "DEDUP\ntitle1\ntitle2\ntitle1" | ./engine

int main(int argc, char* argv[]) {
    std::string mode = argc > 1 ? argv[1] : "DEDUP";

    if (mode == "DEDUP") {
        // Read titles from stdin, output non-duplicate indices
        BloomFilter bf(65536);
        std::string line;
        int idx = 0;
        while (std::getline(std::cin, line)) {
            std::string key = line.substr(0, 50);
            std::transform(key.begin(), key.end(), key.begin(), ::tolower);
            if (!bf.contains(key)) {
                bf.add(key);
                std::cout << idx << "\n";
            }
            idx++;
        }
    }
    else if (mode == "TOPK") {
        // Read: k on first line, then "id\tscore\ttimestamp" per line
        int k = 20;
        std::cin >> k;
        std::cin.ignore();
        std::vector<Article> articles;
        std::string line;
        while (std::getline(std::cin, line)) {
            std::istringstream ss(line);
            Article a;
            std::string score_str, ts_str;
            std::getline(ss, a.id, '\t');
            std::getline(ss, a.title, '\t');
            std::getline(ss, score_str, '\t');
            std::getline(ss, ts_str, '\t');
            a.score = std::stod(score_str);
            a.timestamp = std::stoll(ts_str);
            articles.push_back(a);
        }
        auto result = topK(articles, k);
        for (auto& a : result) {
            std::cout << a.id << "\t" << a.score << "\n";
        }
    }
    else if (mode == "SEARCH") {
        // Read: pattern on first line, then titles
        std::string pattern;
        std::getline(std::cin, pattern);
        std::transform(pattern.begin(), pattern.end(), pattern.begin(), ::tolower);
        std::string line;
        int idx = 0;
        while (std::getline(std::cin, line)) {
            std::string lower = line;
            std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
            if (kmpSearch(lower, pattern)) {
                std::cout << idx << "\n";
            }
            idx++;
        }
    }

    return 0;
}
