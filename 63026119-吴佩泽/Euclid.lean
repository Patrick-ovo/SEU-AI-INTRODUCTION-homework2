import Mathlib

-- 欧几里得定理：任意自然数 n 都有一个比它大的素数。
-- 这个版本也包含 n = 0，因此比只要求 n > 0 更强。
theorem exists_prime_gt (n : ℕ) :
    ∃ p : ℕ, Nat.Prime p ∧ n < p := by
  -- n! > 0，所以 n! + 1 ≠ 1，且 n! + 1 有素因子 p。
  have hne : n.factorial + 1 ≠ 1 := by
    have hpos := Nat.factorial_pos n
    omega
  obtain ⟨p, hp, hpdvd⟩ := Nat.exists_prime_and_dvd hne
  refine ⟨p, hp, ?_⟩
  -- 若 p ≤ n，则 p 同时整除 n! 和 n! + 1，因而整除 1。
  by_contra h
  have hle : p ≤ n := by omega
  have hpfact : p ∣ n.factorial := Nat.dvd_factorial hp.pos hle
  have hpone : p ∣ 1 := (Nat.dvd_add_iff_right hpfact).2 hpdvd
  exact hp.not_dvd_one hpone

#print axioms exists_prime_gt

-- 与题目逐字对应的正整数版本。
theorem exists_prime_gt_pos (n : ℕ) (_hn : 0 < n) :
    ∃ p : ℕ, Nat.Prime p ∧ n < p := by
  exact exists_prime_gt n

#print axioms exists_prime_gt_pos
