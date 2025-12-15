'use client';

import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import {use, useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

const SignUpModal = ({ onClose }: { onClose: () => void }) => {

    const [emailDuplication, setEmailDuplication] = useState(false);
    const [idDuplication, setIdDuplication] = useState(false);

    interface SignUpFormData {
      email: string;
      id: string;
      password: string;
      passwordCheck: string;
    }

    const { register, handleSubmit, formState: { errors,isSubmitting,isValid },watch,getValues,trigger }= useForm<SignUpFormData>({
      mode : "onBlur",
      defaultValues : {
        email : "",
        id : "",
        password : "",
        passwordCheck : ""
      }
    });
    
    const watchEmail = watch("email");

    useEffect(() => {
      console.log("watchEmail : "+watchEmail);
      console.log("register : "+getValues("email"));
      //console.log("trigger : "+trigger("email"));    
        
    },[watchEmail])



   


    /**
     * 이메일 중복 체크 함수
     */
    const emailCheckHandler = () => {
    };

    /**
     * 아이디 중복 체크 함수
     */
    const IdCheckHandler = () => {

    };

    const submitForm : SubmitHandler<SignUpFormData> = (data) => {
      alert("회원가입이 완료되었습니다.");
    }


    return (
    <Modal onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-semibold">회원가입</h2>

      <form className="space-y-4" onSubmit={handleSubmit(submitForm)} noValidate>
        <div>
            <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                    <input type="text" id="signup-email" className="peer w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none" placeholder="email" {...register("email",{
                            required : true,
                            pattern : {
                            value : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                            message : "유효한 이메일 형식이 아닙니다."
                            }
                        })}/>
                    <label htmlFor="signup-email" className="absolute -top-3 left-2 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600">이메일</label>
                </div>
                <button
                type="button"
                className="flex-shrink-0 whitespace-nowrap rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                onClick={emailCheckHandler}
                >
                중복 확인
                </button>
            </div>
            <div className="h-6 pt-1">
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
        </div>

        <div>
            <div className="flex items-center space-x-2">
                <div className="relative flex-grow">
                    <input type="text" id="signup-id" maxLength={10} className="peer w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none" placeholder="id" {...register("id",{
                        required : "아이디를 입력해주세요.",
                        minLength : {
                            value : 2,
                            message : "아이디는 최소 2자 이상이어야 합니다."
                        },
                        pattern : {
                            value : /^[a-zA-Z0-9가-힣]+$/,
                            message : "영문, 숫자, 완성된 한글만 입력 가능합니다."
                        }
                        })}/>
                    <label htmlFor="signup-id" className="absolute -top-3 left-2 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600">아이디</label>
                </div>
                <button
                type="button"
                className="flex-shrink-0 whitespace-nowrap rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                onClick={IdCheckHandler}
                >
                중복 확인
                </button>
            </div>
            <div className="h-6 pt-1">
              {errors.id && <p className="text-sm text-red-500">{errors.id.message}</p>}
            </div>
        </div>
        
        <div>
          <div className="relative">
              <input type="password" id="signup-password" maxLength={20} className="peer w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none" placeholder="password" {...register("password",{
                  required : "비밀번호를 입력해주세요.",
                  minLength : {
                  value : 6,
                  message : "비밀번호는 최소 6자 이상이어야 합니다."
                  },
                  pattern : {
                  value : /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+[\]{};':"\\|,.<>/?]).{6,}$/,
                  message : "비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다."
                  }
                  })}/>
              <label htmlFor="signup-password" className="absolute -top-3 left-2 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600">비밀번호</label>
          </div>
          <div className="h-6 pt-1">
            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
          </div>
        </div>

        <div>
          <div className="relative">
              <input type="password" id="signup-passwordCheck" className="peer w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-transparent focus:border-blue-500 focus:outline-none" placeholder="passwordCheck" {...register("passwordCheck",{
                      required : "비밀번호를 다시 입력해주세요.",
                      validate : value => value === getValues("password") || "비밀번호가 일치하지 않습니다."
                  })}/>
              <label htmlFor="signup-passwordCheck" className="absolute -top-3 left-2 bg-white px-1 text-sm text-gray-600 transition-all peer-placeholder-shown:top-2 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-sm peer-focus:text-blue-600">비밀번호 확인</label>
          </div>
          <div className="h-6 pt-1">
            {errors.passwordCheck && <p className="text-sm text-red-500">{errors.passwordCheck.message}</p>}
          </div>
        </div>
        <button type="submit" className="w-full rounded-md bg-blue-600 py-3 text-lg font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          가입하기
        </button>
      </form>
    </Modal>
  );
}

export default SignUpModal;