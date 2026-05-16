import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * 检测 URL 中 ?nfc=TOKEN 参数：
 * - 调用 /api/auth/nfc 完成登录
 * - 已注册用户跳转 /welcome
 * - 未注册用户跳转 /register
 * - 失败显示错误（暂时通过 alert，后续接 UI）
 */
export function useNfcLogin() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithNfc } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    const token = params.get('nfc');
    if (!token || handledRef.current) return;
    handledRef.current = true;

    loginWithNfc(token)
      .then((res) => {
        // 清掉 query 防止刷新重复触发
        const next = new URLSearchParams(params);
        next.delete('nfc');
        setParams(next, { replace: true });
        navigate(res.registered ? '/welcome' : '/register', { replace: true });
      })
      .catch((err) => {
        handledRef.current = false;
        alert(`NFC 登录失败：${err.message}`);
      });
  }, [params, setParams, navigate, loginWithNfc]);
}
