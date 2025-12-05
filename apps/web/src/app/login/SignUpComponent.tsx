'use client';

import api from "@/lib/api";
import Modal from "../_components/modalComponent";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

const SignUpModal = ({ onClose }: { onClose: () => void }) => {
    useEffect(() => {
        api.get("/users")
        .then((response) => {
            console.log("Users:", response.data);
        }).catch((error) => {
            console.error("Error fetching users:", error);
        });
    },[])

    const { register,handleSubmit } = useForm({
      defaultValues : {
        email: '',
        id: '',
        password: '',
        passwordCheck: ''
      }
    });

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

    const submitForm = () => {
      console.log("register : "+register.toString());
    }


    return (
    <Modal onClose={onClose}>
      <h2 className="mb-6 text-center text-2xl font-semibold">회원가입</h2>

      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            이메일
          </label>
          <div className="flex items-center space-x-2">
            <input type="text" className="input-style flex-grow" {...register("email",{required : true})}/>
            <button
              type="button"
              className="whitespace-nowrap rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
              onClick={emailCheckHandler}
            >
              중복 확인
            </button>
          </div>
        </div>
        <div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700">
            비밀번호
          </label>
          <input type="password" required className="input-style" {...register("password",{required : true})}/>
        </div>
        <div>
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