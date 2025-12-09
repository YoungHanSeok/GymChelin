'use client';

import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import {useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";

const SignUpModal = ({ onClose }: { onClose: () => void }) => {
    interface SignUpFormData {
      email: string;
      id: string;
      password: string;
      passwordCheck: string;
    }

    const { register, handleSubmit, formState: { errors,isSubmitting,isValid },watch,getValues,trigger }= useForm<SignUpFormData>({
      mode : "onChange",
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
      console.log("aaa");
      console.log("data : "+data);
    }


    return (
    <Modal onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-semibold">회원가입</h2>

      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <div className="h-20">
          <label className="block text-sm font-medium text-gray-700">
            이메일
          </label>
          <div className="flex items-center space-x-2">
            <input type="text" required className="input-style flex-grow" {
              ...register("email",{
                    required : true,
                    pattern : {
                      value : /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message : "유효한 이메일 형식이 아닙니다."
                    }
                  })
              }/>
            <button
              type="button"
              className="whitespace-nowrap rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              onClick={emailCheckHandler}
            >
              중복 확인
            </button>
            
          </div>
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>
        <div className="h-20">
          <label className="block text-sm font-medium text-gray-700">
            아이디
          </label>
          <div className="flex items-center space-x-2">
            <input type="text" required className="input-style flex-grow" {...register("id",{required : true})}/>
            <button
              type="button"
              className="whitespace-nowrap rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              onClick={IdCheckHandler}
            >
              중복 확인
            </button>
          </div>
        </div>
        <div className="h-20">
          <label className="block text-sm font-medium text-gray-700">
            비밀번호
          </label>
          <input type="password" required className="input-style" {...register("password",{required : true})}/>
        </div>
        <div className="h-20">
          <label className="block text-sm font-medium text-gray-700">
            비밀번호 확인
          </label>
          <input type="password" required className="input-style" {...register("passwordCheck",{required : true})}/>
        </div>
        <button type="submit" className="button-primary mt-2">
          가입하기
        </button>
      </form>
    </Modal>
  );
}

export default SignUpModal;